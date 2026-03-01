import Array "mo:core/Array";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Queue "mo:core/Queue";
import Iter "mo:core/Iter";
import Timer "mo:core/Timer";



actor {
  // ICDex Types (no HTTP outcalls yet)
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

  type LogEntry = {
    timestamp : Time.Time;
    eventType : Text;
    message : Text;
  };

  let activityLog = Queue.empty<LogEntry>();

  public query ({ caller }) func getActivityLog(count : Nat, page : Nat) : async [LogEntry] {
    if (count <= 0) { return [] };
    let totalEntries = activityLog.size();
    if (totalEntries == 0) { return [] };
    let startIndex = page * count;
    let remainingEntries = if (totalEntries > startIndex) { totalEntries - startIndex : Nat } else { 0 };
    let countToReturn = Nat.min(count, remainingEntries);
    let toVarArray = activityLog.toVarArray().toArray();
    let reversedEntries = toVarArray.reverse();
    reversedEntries.sliceToArray(startIndex, countToReturn);
  };

  func addLogEntry(eventType : Text, message : Text) {
    let entry = {
      timestamp = Time.now();
      eventType;
      message;
    };

    let toVarArray = activityLog.toVarArray();
    let logArray = toVarArray.toArray();
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

  private func sideToText(side : Side) : Text {
    switch (side) {
      case (#buy) { "buy" };
      case (#sell) { "sell" };
    };
  };

  public query ({ caller }) func getLastGrid() : async [(Text, Nat)] {
    let gridCopy = lastGridData;
    gridCopy.map<(Side, Nat), (Text, Nat)>(
      func((side, price)) { (sideToText(side), price) }
    );
  };

  public query ({ caller }) func getTradeHistory() : async [OrderEntry] {
    orderHistoryMap.values().toVarArray<OrderEntry>().toArray();
  };

  func createOrderId() : Nat {
    let id = nextOrderId;
    nextOrderId += 1;
    id;
  };

  public shared ({ caller }) func startBot() : async () {
    if (botRunning) { return };
    switch (timerId) {
      case (?id) { Timer.cancelTimer(id) };
      case (null) {};
    };
    timerId := ?Timer.recurringTimer<system>(#seconds intervalSeconds, tradingLoop);
    botRunning := true;
    addLogEntry("bot_started", "Bot started with interval: " # intervalSeconds.toText() # ", spread: " # spreadBps.toText() # ", orders: " # numOrders.toText());
  };

  public shared ({ caller }) func stopBot() : async () {
    if (not botRunning) { return };
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

    let toArray = buyGrid.toArray();
    let sellArray = sellGrid.toArray();
    lastGridData := toArray.concat(sellArray);

    await placeOrders(toArray.concat(sellArray), midPrice);
  };

  func placeOrders(grid : [(Side, Nat)], price : Nat) : async () {
    let quantity = calculateOrderQuantity(price);

    if (quantity == 0) {
      addLogEntry("error", "Order quantity too small at current price: " # price.toText());
      return;
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

  public query ({ caller }) func pending() : async [OrderEntry] {
    openOrderMap.values().toArray();
  };

  func clearOpenOrders() {
    openOrderMap.clear();
  };

  public shared ({ caller }) func cancelAllOpenOrders() : async () {
    let openOrders = openOrderMap.values();
    for (order in openOrders) {
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
      clearOpenOrders();
      addLogEntry("order_cancelled", "Cancelled order with ID: " # order.orderId.toText());
    };
  };

  // New health check method that always responds, inspired by HTTP outcall structure.
  public query ({ caller }) func healthCheck() : async Bool {
    true; // Always return true to signal canister is alive.
  };
};
