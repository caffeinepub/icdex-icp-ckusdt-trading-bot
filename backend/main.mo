import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Timer "mo:core/Timer";
import Migration "migration";
import Time "mo:core/Time";

(with migration = Migration.run)
actor {
  // ICDex Types
  type Side = { #buy; #sell };
  type OrderType = { #limit; #market; #chase; #post_only };
  type OrderId = Nat;
  type OrderStatus = { #open; #filled; #cancelled };
  type OrderEntry = {
    orderId : OrderId;
    side : Side;
    price : Nat;
    quantity : Nat;
    status : OrderStatus;
    timestamp : Time.Time;
  };

  type OrderArgs = {
    price : Nat;
    quantity : Nat;
    side : Side;
    orderType : OrderType;
  };
  type Level = {
    price : Nat;
    quantity : Nat;
  };
  type Level10 = {
    bids : [Level];
    asks : [Level];
  };
  type Ticker = {
    price : Nat;
    quantity : Nat;
    timestamp : Nat;
  };

  // Persistent Configuration State
  var intervalSeconds : Nat = 60;
  var spreadBps : Nat = 45;
  var numOrders : Nat = 20;
  var botRunning : Bool = false;
  var lastMidPrice : Nat = 0;
  var lastGridData : [(Side, Nat)] = [];
  var timerId : ?Timer.TimerId = null;
  var nextOrderId = 0;

  let orderHistoryMap = Map.empty<Nat, OrderEntry>();

  module GridEntry {
    public func compare(a : (Side, Nat), b : (Side, Nat)) : Order.Order {
      Nat.compare(a.1, b.1);
    };
  };

  // ICDex Persistent Interface
  type ICDex = actor {
    placeOrder : shared OrderArgs -> async OrderId;
    cancelOrder : shared { orderId : OrderId } -> async ();
    getLevel10 : shared () -> async Level10;
    ticker : shared () -> async ?Ticker;
  };

  // ICDex Local Interface with getOpenOrders
  type ICDexWithOpenOrders = actor {
    placeOrder : shared OrderArgs -> async OrderId;
    cancelOrder : shared { orderId : OrderId } -> async ();
    getLevel10 : shared () -> async Level10;
    ticker : shared () -> async ?Ticker;
    getOpenOrders : shared () -> async [OpenOrder];
  };

  let icDex = actor "jgxow-pqaaa-aaaar-qahaq-cai" : ICDex;

  // Open Order type matching ICDex
  type OpenOrder = {
    orderId : Nat;
    side : Side;
    price : Nat;
    quantity : Nat;
  };

  // Public Config and Status Endpoints
  public query ({ caller }) func getBotStatus() : async Bool {
    botRunning;
  };

  public query ({ caller }) func getConfig() : async {
    intervalSeconds : Nat;
    spreadBps : Nat;
    numOrders : Nat;
  } {
    {
      intervalSeconds;
      spreadBps;
      numOrders;
    };
  };

  public shared ({ caller }) func setConfig(newInterval : Nat, newSpread : Nat, newOrders : Nat) : async () {
    if (
      newInterval < 10 or newInterval > 3600 or newSpread < 10 or newSpread > 2000 or newOrders < 4 or newOrders > 50
    ) {
      Runtime.trap("Invalid configuration parameters");
    };
    intervalSeconds := newInterval;
    spreadBps := newSpread;
    numOrders := newOrders;
  };

  public query ({ caller }) func getLastMidPrice() : async Nat {
    lastMidPrice;
  };

  public query ({ caller }) func getLastGrid() : async [(Text, Nat)] {
    lastGridData.map(func((side, price)) { (sideToText(side), price) });
  };

  public query ({ caller }) func getTradeHistory() : async [OrderEntry] {
    orderHistoryMap.values().toArray();
  };

  func createOrderId() : Nat {
    let id = nextOrderId;
    nextOrderId += 1;
    id;
  };

  func sideToText(side : Side) : Text {
    switch (side) {
      case (#buy) { "buy" };
      case (#sell) { "sell" };
    };
  };

  // Bot Control
  public shared ({ caller }) func startBot() : async () {
    if (botRunning) { Runtime.trap("Bot is already running") };
    switch (timerId) {
      case (?id) { Timer.cancelTimer(id) };
      case (null) {};
    };
    timerId := ?Timer.recurringTimer<system>(#seconds intervalSeconds, tradingLoop);
    botRunning := true;
  };

  public shared ({ caller }) func stopBot() : async () {
    if (not botRunning) { Runtime.trap("Bot is not running") };
    switch (timerId) {
      case (?id) { Timer.cancelTimer(id) };
      case (null) {};
    };
    timerId := null;
    botRunning := false;
  };

  // Calculate $10 in e8s at current midPrice
  func calculateOrderQuantity(price : Nat) : Nat {
    let tenDollarsCents = 1_000_000; // 10 USD in cents
    let priceFloat = price.toInt().toFloat();
    let quantityInE8s = tenDollarsCents.toFloat() / priceFloat;
    let quantityInt = quantityInE8s.toInt();
    if (quantityInt < 0) { return 0 };
    quantityInt.toNat();
  };

  // Trading Loop with Full Order Cancellation
  func tradingLoop() : async () {
    await cancelAllOpenOrders();
    let icDexWithOpenOrders = actor "jgxow-pqaaa-aaaar-qahaq-cai" : ICDexWithOpenOrders;
    let level10 = await icDexWithOpenOrders.getLevel10();
    let bestBid = level10.bids[0].price;
    let bestAsk = level10.asks[0].price;
    let midPrice = (bestBid + bestAsk) / 2 : Nat;
    lastMidPrice := midPrice;

    let localNumOrders = numOrders;
    let range = Nat.range(0, localNumOrders / 2);
    let spread = spreadBps;

    let buyGrid = range.map(
      func(i) {
        let offset = midPrice * (i + 1) * spread / 10000;
        let price = midPrice - offset;
        (#buy, price);
      }
    );

    let sellGrid = range.map(
      func(i) {
        let offset = midPrice * (i + 1) * spread / 10000;
        let price = midPrice + offset;
        (#sell, price);
      }
    );

    let buyArray = buyGrid.toArray();
    let sellArray = sellGrid.toArray();
    lastGridData := (buyArray.concat(sellArray)).sort();

    await placeOrders(buyArray.concat(sellArray), midPrice);
  };

  // Place Orders with Dynamic Quantity Calculation and Trade History Logging
  func placeOrders(grid : [(Side, Nat)], price : Nat) : async () {
    let quantity = calculateOrderQuantity(price);

    if (quantity == 0) {
      Runtime.trap("Order quantity too small at current price");
    };

    let currentTimestamp = Time.now();

    for ((side, price) in grid.values()) {
      let orderArgs : OrderArgs = {
        price;
        quantity;
        side;
        orderType = #limit;
      };

      ignore await icDex.placeOrder(orderArgs);

      let orderId = createOrderId();
      let entry = {
        orderId;
        side;
        price;
        quantity;
        status = #open;
        timestamp = currentTimestamp;
      };

      orderHistoryMap.add(orderId, entry);
    };
  };

  // Cancel One Order Test (new function)
  public shared ({ caller }) func cancelOneOrderTest() : async () {
    let orderId = 0;
    await icDex.cancelOrder({ orderId });
  };

  // Fetch open orders from ICDex canister
  public shared ({ caller }) func getOpenOrders() : async [OpenOrder] {
    let icDexWithOpenOrders = actor "jgxow-pqaaa-aaaar-qahaq-cai" : ICDexWithOpenOrders;
    await icDexWithOpenOrders.getOpenOrders();
  };

  // Cancel all open orders and update order history
  public shared ({ caller }) func cancelAllOpenOrders() : async () {
    let openOrders = await getOpenOrders();
    let icDexWithOpenOrders = actor "jgxow-pqaaa-aaaar-qahaq-cai" : ICDexWithOpenOrders;
    for (order in openOrders.values()) {
      await icDexWithOpenOrders.cancelOrder({ orderId = order.orderId });
      let cancelledTimestamp = Time.now();
      let cancelledEntry = {
        orderId = order.orderId;
        side = order.side;
        price = order.price;
        quantity = order.quantity;
        status = #cancelled;
        timestamp = cancelledTimestamp;
      };
      orderHistoryMap.add(order.orderId, cancelledEntry);
    };
  };
};

