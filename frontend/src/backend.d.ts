import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface OrderEntry {
    status: OrderStatus;
    side: Side;
    orderId: OrderId;
    timestamp: Time;
    quantity: bigint;
    price: bigint;
}
export type Time = bigint;
export interface LogEntry {
    message: string;
    timestamp: Time;
    eventType: string;
}
export type OrderId = bigint;
export enum OrderStatus {
    cancelled = "cancelled",
    open = "open",
    filled = "filled"
}
export enum Side {
    buy = "buy",
    sell = "sell"
}
export interface backendInterface {
    cancelAllOpenOrders(): Promise<void>;
    cancelOneOrderTest(): Promise<void>;
    getActivityLog(): Promise<Array<LogEntry>>;
    getBotStatus(): Promise<boolean>;
    getConfig(): Promise<{
        intervalSeconds: bigint;
        spreadBps: bigint;
        numOrders: bigint;
    }>;
    getLastGrid(): Promise<Array<[string, bigint]>>;
    getLastMidPrice(): Promise<bigint>;
    getOpenOrders(): Promise<Array<OrderEntry>>;
    getTradeHistory(): Promise<Array<OrderEntry>>;
    setConfig(newInterval: bigint, newSpread: bigint, newOrders: bigint): Promise<void>;
    startBot(): Promise<void>;
    stopBot(): Promise<void>;
}
