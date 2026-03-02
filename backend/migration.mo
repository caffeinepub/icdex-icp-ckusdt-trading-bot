import Map "mo:core/Map";
import Queue "mo:core/Queue";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import Principal "mo:core/Principal";

module {
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

  type DepositAccountArgs = { owner : Principal };
  type DepositAccount = { owner : Principal; account : Blob };

  type ICDex = actor {
    placeOrder : shared OrderArgs -> async OrderId;
    cancelOrder : shared { orderId : OrderId } -> async ();
    getLevel10 : shared () -> async Level10;
    ticker : shared () -> async ?Ticker;
  };

  type ICDexExtended = actor {
    placeOrder : shared OrderArgs -> async OrderId;
    cancelOrder : shared { orderId : OrderId } -> async ();
    getLevel10 : shared () -> async Level10;
    ticker : shared () -> async ?Ticker;
    getDepositAccount : shared DepositAccountArgs -> async DepositAccount;
  };

  type Ledger = actor {
    account_balance : shared { account : Blob } -> async { e8s : Nat };
  };

  type CkbtcLedger = actor {
    icrc1_balance_of : shared { account : Blob } -> async Nat;
  };

  type LogEntry = {
    timestamp : Time.Time;
    eventType : Text;
    message : Text;
  };

  type OldActor = {
    var intervalSeconds : Nat;
    var spreadPips : Nat;
    var numOrders : Nat;
    var orderSize : Nat;
    var botRunning : Bool;
    var lastMidPrice : Nat;
    var lastGridData : [(Side, Nat)];
    var timerId : ?Timer.TimerId;
    var nextOrderId : Nat;
    var lastBalances : ?{ icpBalance : Nat; ckbtcBalance : Nat };
    orderHistoryMap : Map.Map<Nat, OrderEntry>;
    openOrderMap : Map.Map<Nat, OrderEntry>;
    activityLog : Queue.Queue<LogEntry>;
    icDex : ICDex;
    icpLedger : Ledger;
    ckbtcLedger : CkbtcLedger;
  };

  type NewActor = {
    var intervalSeconds : Nat;
    var spreadPips : Nat;
    var numOrders : Nat;
    var orderSize : Nat;
    var botRunning : Bool;
    var lastMidPrice : Nat;
    var lastGridData : [(Side, Nat)];
    var timerId : ?Timer.TimerId;
    var nextOrderId : Nat;
    var lastBalances : ?{ icpBalance : Nat; ckbtcBalance : Nat };
    orderHistoryMap : Map.Map<Nat, OrderEntry>;
    openOrderMap : Map.Map<Nat, OrderEntry>;
    activityLog : Queue.Queue<LogEntry>;
    icDex : ICDexExtended;
    icpLedger : Ledger;
    ckbtcLedger : CkbtcLedger;
  };

  public func run(old : OldActor) : NewActor {
    {
      var intervalSeconds = old.intervalSeconds;
      var spreadPips = old.spreadPips;
      var numOrders = old.numOrders;
      var orderSize = old.orderSize;
      var botRunning = old.botRunning;
      var lastMidPrice = old.lastMidPrice;
      var lastGridData = old.lastGridData;
      var timerId = old.timerId;
      var nextOrderId = old.nextOrderId;
      var lastBalances = old.lastBalances;
      orderHistoryMap = old.orderHistoryMap;
      openOrderMap = old.openOrderMap;
      activityLog = old.activityLog;
      icDex = actor "5u2c6-kyaaa-aaaar-qadiq-cai" : ICDexExtended;
      icpLedger = old.icpLedger;
      ckbtcLedger = old.ckbtcLedger;
    };
  };
};
