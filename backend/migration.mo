import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  // ICDex Types
  type Side = { #buy; #sell };

  // Order status
  type OrderStatus = { #open; #filled; #cancelled };

  // Order entry (historical)
  type OrderEntry = {
    orderId : Nat;
    side : Side;
    price : Nat;
    quantity : Nat;
    status : OrderStatus;
    timestamp : Time.Time;
  };

  // Persistent state
  type OldActor = {
    intervalSeconds : Nat;
    spreadBps : Nat;
    numOrders : Nat;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    timerId : ?Nat;
  };

  // Persistent state with order history
  type NewActor = {
    intervalSeconds : Nat;
    spreadBps : Nat;
    numOrders : Nat;
    botRunning : Bool;
    lastMidPrice : Nat;
    lastGridData : [(Side, Nat)];
    timerId : ?Nat;
    orderHistoryMap : Map.Map<Nat, OrderEntry>;
    nextOrderId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      orderHistoryMap = Map.empty<Nat, OrderEntry>();
      nextOrderId = 0;
    };
  };
};
