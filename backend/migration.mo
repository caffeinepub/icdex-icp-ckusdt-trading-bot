import Map "mo:core/Map";
import Timer "mo:core/Timer";
import Queue "mo:core/Queue";

module {
  // Redefine Side type for migration context.
  type Side = { #buy; #sell };

  // LogEntry type for migration context.
  type LogEntry = {
    timestamp : Int;
    eventType : Text;
    message : Text;
  };

  // Define OrderEntry type for migration context.
  type OrderEntry = {
    orderId : Nat;
    side : Side;
    price : Nat;
    quantity : Nat;
    status : { #open; #filled; #cancelled };
    timestamp : Int;
  };

  type Actor = {
    intervalSeconds : Nat;
    spreadBps : Nat;
    numOrders : Nat;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    timerId : ?Timer.TimerId;
    nextOrderId : Nat;
    orderHistoryMap : Map.Map<Nat, OrderEntry>;
    openOrderMap : Map.Map<Nat, OrderEntry>;
    activityLog : Queue.Queue<LogEntry>;
  };

  public func run(old : Actor) : Actor {
    old;
  };
};
