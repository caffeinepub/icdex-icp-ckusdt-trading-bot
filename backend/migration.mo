import Map "mo:core/Map";
import Queue "mo:core/Queue";
import Time "mo:core/Time";
import Nat "mo:core/Nat";

module {
  type Side = { #buy; #sell };
  type OrderId = Nat;
  type OrderStatus = { #open; #filled; #cancelled };
  type Order = {
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
    orderHistoryMap : Map.Map<Nat, Order>;
    activityLog : Queue.Queue<LogEntry>;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    nextOrderId : Nat;
  };

  type NewActor = {
    orderHistoryMap : Map.Map<Nat, Order>;
    activityLog : Queue.Queue<LogEntry>;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    nextOrderId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      orderHistoryMap = old.orderHistoryMap;
      activityLog = old.activityLog;
      botRunning = old.botRunning;
      lastMidPrice = old.lastMidPrice;
      lastGridData = old.lastGridData;
      nextOrderId = old.nextOrderId;
    };
  };
};
