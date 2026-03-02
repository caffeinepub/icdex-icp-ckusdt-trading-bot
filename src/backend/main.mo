import Array "mo:core/Array";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Queue "mo:core/Queue";
import Timer "mo:core/Timer";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

import Migration "migration";

(with migration = Migration.run)
actor self {
  type DepositAccountArgs = { owner : Principal };
  type DepositAccount = { owner : Principal; account : Blob };

  type ICDexExtended = actor {
    placeOrder : shared OrderArgs -> async OrderId;
    cancelOrder : shared { orderId : OrderId } -> async ();
    level10 : shared () -> async Level10;
    ticker : shared () -> async ?Ticker;
    getDepositAccount : shared DepositAccountArgs -> async DepositAccount;
  };

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
  var spreadPips : Nat = 45;
  var numOrders : Nat = 20;
  var orderSize : Nat = 5;
  var botRunning : Bool = false;
  var lastMidPrice : Nat = 0;
  var lastGridData : [(Side, Nat)] = [];
  var timerId : ?Timer.TimerId = null;
  var nextOrderId = 0;
  var lastBalances : ?{ icpBalance : Nat; ckbtcBalance : Nat } = null;

  let orderHistoryMap = Map.empty<Nat, OrderEntry>();
  let openOrderMap = Map.empty<Nat, OrderEntry>();

  let activityLog = Queue.empty<LogEntry>();

  type Ledger = actor {
    account_balance : shared { account : Blob } -> async { e8s : Nat };
  };

  type CkbtcLedger = actor {
    icrc1_balance_of : shared { owner : Principal; subaccount : ?Blob } -> async Nat;
  };

  var icDex : ICDexExtended = actor "5u2c6-kyaaa-aaaar-qadiq-cai";
  var icpLedger : Ledger = actor "ryjl3-tyaaa-aaaaa-aaaba-cai";
  var ckbtcLedger : CkbtcLedger = actor "mxzaz-hqaaa-aaaar-qaada-cai";

  type LogEntry = {
    timestamp : Time.Time;
    eventType : Text;
    message : Text;
  };

  public query ({ caller }) func getActivityLog(count : Nat, page : Nat) : async [LogEntry] {
    if (count <= 0) { return [] };
    let totalEntries = activityLog.size();
    if (totalEntries == 0) { return [] };
    let startIndex = page * count;
    let remainingEntries = if (totalEntries > startIndex) { totalEntries - startIndex : Nat } else { 0 };
    let countToReturn = Nat.min(count, remainingEntries);
    if (countToReturn == 0) { return [] };
    let toVarArray = activityLog.toVarArray();
    let logArray = toVarArray.toArray();
    let reversedEntries = logArray.reverse();
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
    spreadPips : Nat;
    numOrders : Nat;
    orderSize : Nat;
  } {
    {
      intervalSeconds;
      spreadPips;
      numOrders;
      orderSize;
    };
  };

  public shared ({ caller }) func updateConfig(newInterval : Nat, newSpread : Nat, newOrders : Nat, newOrderSize : Nat) : async () {
    let oldInterval = intervalSeconds;
    let oldSpread = spreadPips;
    let oldOrders = numOrders;
    let oldOrderSize = orderSize;
    intervalSeconds := newInterval;
    spreadPips := newSpread;
    numOrders := newOrders;
    orderSize := newOrderSize;
    addLogEntry(
      "config_updated",
      "Config updated from { interval: " # oldInterval.toText() # ", spread: " # oldSpread.toText() # ", orders: " # oldOrders.toText() # ", size: " # oldOrderSize.toText() # " } to { interval: " # newInterval.toText() # ", spread: " # newSpread.toText() # ", orders: " # newOrders.toText() # ", size: " # newOrderSize.toText() # " }"
    );
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
    timerId := ?Timer.recurringTimer<system>(#seconds(intervalSeconds), tradingLoop);
    botRunning := true;
    addLogEntry("bot_started", "Bot started with interval: " # intervalSeconds.toText() # ", spread: " # spreadPips.toText() # ", orders: " # numOrders.toText());
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
    if (price == 0) { return 0 };
    let orderSizeE8s = orderSize * 100_000_000;
    orderSizeE8s * 1_000_000 / price;
  };

  // Core grid trading loop with real reconciliation logic
  func tradingLoop() : async () {
    addLogEntry("trading_loop_start", "Starting new trading loop iteration");
    addLogEntry("fetch_best_bid", "Fetching current best bid price from ICDex");
    addLogEntry("fetch_best_ask", "Fetching current best ask price from ICDex");

    let level10 = await icDex.level10();
    addLogEntry("fetched_level10", "Successfully fetched level10 data");

    let bestBid = level10.bids[0].price;
    let bestAsk = level10.asks[0].price;
    let midPrice = (bestBid + bestAsk) / 2 : Nat;
    lastMidPrice := midPrice;

    // Maintain grid symmetry
    let localNumOrders = numOrders;
    let ordersPerSide = if (localNumOrders % 2 == 0) { localNumOrders / 2 } else {
      (localNumOrders + 1) / 2 // Round up for odd numbers
    };

    // Calculate price levels for each grid
    let buyGrid = Nat.range(0, ordersPerSide).map(
      func(i) {
        let offset = midPrice * (i + 1) * spreadPips / 10000;
        let price = if (midPrice > offset) {
          midPrice - offset;
        } else {
          0;
        };
        (#buy, price);
      }
    );

    let sellGrid = Nat.range(0, ordersPerSide).map(
      func(i) {
        let offset = midPrice * (i + 1) * spreadPips / 10000;
        (#sell, midPrice + offset);
      }
    );

    let gridArray = buyGrid.toArray().concat(sellGrid.toArray());
    lastGridData := gridArray;

    addLogEntry("grid_prices", "Calculated grid prices for both buy and sell sides");
    await reconcileAndPlaceOrders(gridArray, midPrice);
  };

  func reconcileAndPlaceOrders(grid : [(Side, Nat)], price : Nat) : async () {
    addLogEntry("reconciliation_start", "Starting order reconciliation and placement process");

    // Maintain max grid symmetry
    let ordersPerSide = numOrders / 2;

    if (ordersPerSide == 0 or ordersPerSide == 1) {
      // Only place one order per side at the first grid level
      await placeSingleOrderPerSide(grid[0], price);
      await placeSingleOrderPerSide(grid[ordersPerSide], price);
    } else if (ordersPerSide == 2) {
      // Place only two orders at the first two grid levels for each side
      await placeFirstTwoOrdersPerSide(grid, 0, ordersPerSide, price); // Buy orders (first 2 orders)
      await placeFirstTwoOrdersPerSide(grid, ordersPerSide, numOrders, price); // Sell orders (first 2 sell orders)
    } else {
      let startBuyRange = 0;
      let endBuyRange = Nat.min(3, ordersPerSide); // Only place 3 buy orders
      await placeOrdersInRange(grid, startBuyRange, endBuyRange, price);

      let startSellRange = ordersPerSide;
      let endSellRange = Nat.min(endBuyRange + ordersPerSide, grid.size());
      await placeOrdersInRange(grid, startSellRange, endSellRange, price);
    };

    await tryCancelRestOrders();
  };

  func tryCancelRestOrders() : async () {
    let cancelResult = await cancelAllOpenOrders();
    switch (cancelResult) {
      case (#ok) {
        addLogEntry("cancel_orders_success", "Successfully cancelled remaining orders");
      };
      case (#err(e)) {
        addLogEntry("cancel_orders_error", "Error cancelling remaining orders: " # e);
      };
    };
  };

  func placeFirstTwoOrdersPerSide(grid : [(Side, Nat)], startIndex : Nat, endIndex : Nat, price : Nat) : async () {
    let range = Nat.range(
      startIndex,
      Nat.min(endIndex, grid.size()),
    );
    for (i in range) {
      await placeSingleOrderPerSide(grid[i], price);
    };
  };

  func placeSingleOrderPerSide(level : (Side, Nat), price : Nat) : async () {
    let range = Nat.range(0, 2);
    for (_unused in range) {
      await placeOrderIfNotExists(level, price);
    };
  };

  func placeOrdersInRange(grid : [(Side, Nat)], start : Nat, end : Nat, price : Nat) : async () {
    // Place at most 3 orders in the given range
    let rangeEnd = Nat.min(start + 3, end);
    let range = Nat.range(start, rangeEnd);
    for (i in range) {
      await placeOrderIfNotExists(grid[i], price);
    };
  };

  func placeOrderIfNotExists(level : (Side, Nat), _midPrice : Nat) : async () {
    let newOrderId = createOrderId();

    let price = level.1;
    let quantity = calculateOrderQuantity(price);
    if (quantity == 0) {
      addLogEntry("info", "Order quantity too small at current price: " # price.toText());
      return;
    };

    let orderArgs : OrderArgs = {
      price;
      quantity;
      side = level.0;
      orderType = #limit;
    };

    let currentTimestamp = Time.now();
    let entry = {
      orderId = newOrderId;
      side = level.0;
      price;
      quantity;
      status = #open;
      timestamp = currentTimestamp;
    };

    let placementResult = await placeOrderWithRetry(orderArgs, 3);
    switch (placementResult) {
      case (#ok(_)) {
        openOrderMap.add(newOrderId, entry);
        orderHistoryMap.add(newOrderId, entry);

        let actionText = if (level.0 == #buy) { "Buy" } else { "Sell" };
        let actionType = if (level.0 == #buy) { "buy_order_created" } else { "sell_order_created" };
        addLogEntry(
          actionType,
          actionText # " Order Created at Price: " # price.toText() # ", Quantity: " # quantity.toText() # ", Successful"
        );
      };
      case (#err(err)) {
        let actionText = if (level.0 == #buy) { "Buy" } else { "Sell" };
        let actionType = if (level.0 == #buy) { "buy_order_creation_failed" } else { "sell_order_creation_failed" };
        addLogEntry(
          actionType, // Log both successes and failures
          actionText # " Order Failed at Price: " # price.toText() # ", Quantity: " # quantity.toText() # ", Error: " # err
        );
      };
    };
  };

  func placeOrderWithRetry(
    orderArgs : OrderArgs,
    maxRetries : Nat,
  ) : async { #ok : OrderId; #err : Text } {
    var attempts = 0;
    var lastError : Text = "";
    while (attempts < maxRetries) {
      try {
        let remoteOrderId = await icDex.placeOrder(orderArgs);
        return #ok(remoteOrderId);
      } catch (e : Error) {
        lastError := "Attempt " # attempts.toText() # ": Error caught: " # e.message() # " ";
      };
      attempts += 1;
    };
    #err("Failed to place order after " # maxRetries.toText() # " attempts. Last error: " # lastError);
  };

  func clearOpenOrders() {
    openOrderMap.clear();
  };

  public shared ({ caller }) func cancelAllOpenOrders() : async { #ok; #err : Text } {
    let openOrders = openOrderMap.values();
    for (order in openOrders) {
      try {
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
        addLogEntry(
          "order_cancelled",
          "Cancelled order with ID: " # order.orderId.toText(),
        );
      } catch (e : Error) {
        addLogEntry("cancel_orders_error", "Error cancelling open orders: " # e.message());
        return #err("Error cancelling open orders: " # e.message());
      };
    };
    #ok;
  };

  public shared ({ caller }) func cancelSingleOrder(orderId : Nat) : async { #ok; #err : Text } {
    if (openOrderMap.containsKey(orderId)) {
      let order = switch (openOrderMap.get(orderId)) {
        case (null) { return #err("Order not found in local state") };
        case (?order) { order };
      };
      try {
        await icDex.cancelOrder({ orderId });
        let cancelledTimestamp = Time.now();
        let cancelledEntry = {
          orderId;
          side = order.side;
          price = order.price;
          quantity = order.quantity;
          status = #cancelled;
          timestamp = cancelledTimestamp;
        };
        orderHistoryMap.add(orderId, cancelledEntry);

        openOrderMap.remove(orderId);
        addLogEntry(
          "order_cancelled",
          "Cancelled order with ID: " # orderId.toText(),
        );
        #ok;
      } catch (e : Error) {
        addLogEntry("cancel_order_error", "Error cancelling order with ID " # orderId.toText() # ": " # e.message());
        #err("Error cancelling order with ID " # orderId.toText() # ": " # e.message());
      };
    } else {
      addLogEntry("cancel_order_error", "Order ID " # orderId.toText() # " not found in open orders");
      #err("Order ID " # orderId.toText() # " not found in open orders");
    };
  };

  public query ({ caller }) func healthCheck() : async Bool {
    true;
  };

  public query ({ caller }) func getOpenOrders() : async [OrderEntry] {
    openOrderMap.values().toVarArray<OrderEntry>().toArray();
  };

  public shared ({ caller }) func getBalances() : async { icpBalance : Nat; ckbtcBalance : Nat } {
    let icpAccountIdentifierBlob : Blob = "\6f\04\d3\6f\fc\3c\4c\39\24\3d\99\00\f9\d5\0c\d2\5d\4e\62\8f\2f\28\79\f3\10\21\c2\ef\d9\f2\b1\ef";
    let icpBalance = await icpLedger.account_balance({ account = icpAccountIdentifierBlob });
    let ckbtcBalance = await ckbtcLedger.icrc1_balance_of({ owner = Principal.fromActor(self); subaccount = null });
    let balances = { icpBalance = icpBalance.e8s; ckbtcBalance };
    lastBalances := ?balances;
    balances;
  };

  public shared ({ caller }) func getDepositAddr() : async DepositAccount {
    let botPrincipal = Principal.fromActor(self);
    await icDex.getDepositAccount({ owner = botPrincipal });
  };
};
