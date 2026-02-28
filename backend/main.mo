import Map "mo:core/Map";
import Queue "mo:core/Queue";
import Timer "mo:core/Timer";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";
import Time "mo:core/Time";
import List "mo:core/List";

actor {
  // ICDex Types (no outcalls pendingAll)
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

  var intervalSeconds : Nat = 60;
  var spreadBps : Nat = 45;
  var numOrders : Nat = 20;
  var botRunning : Bool = false;
  var lastMidPrice : Nat = 0;
  var lastGridData : [(Side, Nat)] = [];
  var timerId : ?Timer.TimerId = null;
  var nextOrderId = 0;

  let orderHistoryMap = Map.empty<Nat, OrderEntry>();
  let openOrderMap = Map.empty<Nat, OrderEntry>();

  type ICDex = actor {
    placeOrder : shared OrderArgs -> async OrderId;
    cancelOrder : shared { orderId : OrderId } -> async ();
    getLevel10 : shared () -> async Level10;
    ticker : shared () -> async ?Ticker;
  };

  let icDex = actor "jgxow-pqaaa-aaaar-qahaq-cai" : ICDex;

  type OpenOrder = {
    orderId : Nat;
    side : Side;
    price : Nat;
    quantity : Nat;
  };

  type LogEntry = {
    timestamp : Time.Time;
    eventType : Text;
    message : Text;
  };

  let activityLog = Queue.empty<LogEntry>();

  public query ({ caller }) func getActivityLog() : async [LogEntry] {
    activityLog.toVarArray<LogEntry>().toArray();
  };

  func addLogEntry(eventType : Text, message : Text) {
    let entry = {
      timestamp = Time.now();
      eventType;
      message;
    };

    let logArray = activityLog.toVarArray().toArray();
    activityLog.clear();

    let maxLogSize = 100;
    let prunedArray : [LogEntry] = if (logArray.size() >= maxLogSize) {
      if (logArray.size() > 0) {
        logArray.sliceToArray(0, logArray.size() - 1);
      } else {
        [];
      };
    } else {
      logArray;
    };

    for (log in prunedArray.values()) {
      activityLog.pushBack(log);
    };

    activityLog.pushBack(entry);
  };

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

  func sideToText(side : Side) : Text {
    switch (side) {
      case (#buy) { "buy" };
      case (#sell) { "sell" };
    };
  };

  public query ({ caller }) func getLastGrid() : async [(Text, Nat)] {
    let gridCopy = lastGridData;
    gridCopy.map(
      func((side, price)) {
        (sideToText(side), price);
      }
    );
  };

  public query ({ caller }) func getTradeHistory() : async [OrderEntry] {
    let tradeHistory = orderHistoryMap.values().toVarArray<OrderEntry>().toArray();
    tradeHistory;
  };

  func createOrderId() : Nat {
    let id = nextOrderId;
    nextOrderId += 1;
    id;
  };

  public shared ({ caller }) func startBot() : async () {
    if (botRunning) { Runtime.trap("Bot is already running") };
    switch (timerId) {
      case (?id) { Timer.cancelTimer(id) };
      case (null) {};
    };
    timerId := ?Timer.recurringTimer<system>(#seconds intervalSeconds, tradingLoop);
    botRunning := true;
    addLogEntry("bot_started", "Bot started with interval: " # intervalSeconds.toText() # ", spread: " # spreadBps.toText() # ", orders: " # numOrders.toText());
  };

  public shared ({ caller }) func stopBot() : async () {
    if (not botRunning) { Runtime.trap("Bot is not running") };
    switch (timerId) {
      case (?id) { Timer.cancelTimer(id) };
      case (null) {};
    };
    timerId := null;
    botRunning := false;
    addLogEntry("bot_stopped", "Bot stopped");
  };

  func calculateOrderQuantity(price : Nat) : Nat {
    let tenDollarsCents = 1_000_000; // 10 USD in cents without floating point
    let priceFloat = price.toInt().toFloat(); // Convert price to float for calculation
    let quantityInE8s = tenDollarsCents.toFloat() / priceFloat; // Calculate quantity in e8s
    let quantityInt = quantityInE8s.toInt(); // Convert back to integer
    if (quantityInt < 0) { Runtime.trap("Order quantity too small at current price") };
    quantityInt.toNat();
  };

  func tradingLoop() : async () {
    await cancelAllOpenOrders();
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
    lastGridData := buyArray.concat(sellArray);

    await placeOrders(buyArray.concat(sellArray), midPrice);
  };

  func placeOrders(grid : [(Side, Nat)], price : Nat) : async () {
    let quantity = calculateOrderQuantity(price);

    if (quantity == 0) {
      addLogEntry("error", "Order quantity too small at current price: " # price.toText());
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
      openOrderMap.add(orderId, entry);
      addLogEntry("order_placed", "Placed " # sideToText(side) # " order at price: " # price.toText() # " with quantity: " # quantity.toText());
    };
  };

  public shared ({ caller }) func cancelOneOrderTest() : async () {
    let orderId = 0;
    await icDex.cancelOrder({ orderId });
    addLogEntry("order_cancelled", "Cancelled order with ID: " # orderId.toText());
  };

  public query ({ caller }) func getOpenOrders() : async [OrderEntry] {
    openOrderMap.values().toArray();
  };

  public shared ({ caller }) func cancelAllOpenOrders() : async () {
    let openOrders = await getOpenOrders();
    for (order in openOrders.values()) {
      await icDex.cancelOrder({ orderId = order.orderId });
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
      openOrderMap.remove(order.orderId);
      addLogEntry("order_cancelled", "Cancelled order with ID: " # order.orderId.toText());
    };
  };
};
