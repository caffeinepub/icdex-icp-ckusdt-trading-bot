import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Queue "mo:core/Queue";
import Time "mo:core/Time";

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

  type LogEntry = {
    timestamp : Time.Time;
    eventType : Text;
    message : Text;
  };

  type OldActor = {
    intervalSeconds : Nat;
    spreadBps : Nat;
    numOrders : Nat;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    timerId : ?Nat;
    nextOrderId : Nat;
    orderHistoryMap : Map.Map<Nat, OrderEntry>;
  };

  type NewActor = {
    intervalSeconds : Nat;
    spreadBps : Nat;
    numOrders : Nat;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    timerId : ?Nat;
    nextOrderId : Nat;
    orderHistoryMap : Map.Map<Nat, OrderEntry>;
    activityLog : Queue.Queue<LogEntry>;
  };

  public func run(old : OldActor) : NewActor {
    let emptyLog = Queue.empty<LogEntry>();
    { old with activityLog = emptyLog };
  };
};
