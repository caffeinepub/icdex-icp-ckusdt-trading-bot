import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Timer "mo:core/Timer";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Int "mo:core/Int";

actor {
  // ICDex Types
  type Side = { #buy; #sell };
  type OrderType = { #limit; #market; #chase; #post_only };
  type OrderId = Nat;
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
    if (newInterval < 10 or newInterval > 3600 or newSpread < 10 or newSpread > 2000 or newOrders < 4 or newOrders > 50) {
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

  // Trading Loop
  func tradingLoop() : async () {
    let level10 = await icDex.getLevel10();

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

  // Place Orders with Dynamic Quantity Calculation
  func placeOrders(grid : [(Side, Nat)], price : Nat) : async () {
    let quantity = calculateOrderQuantity(price);
    if (quantity == 0) {
      Runtime.trap("Order quantity too small at current price");
    };
    for ((side, price) in grid.values()) {
      let orderArgs : OrderArgs = {
        price;
        quantity;
        side;
        orderType = #limit;
      };
      ignore await icDex.placeOrder(orderArgs);
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
};
