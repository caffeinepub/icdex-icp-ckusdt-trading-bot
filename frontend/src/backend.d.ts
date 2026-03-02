import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface LogEntry {
    message: string;
    timestamp: Time;
    eventType: string;
}
export interface DepositAccount {
    owner: Principal;
    account: Uint8Array;
}
export interface OrderEntry {
    status: OrderStatus;
    side: Side;
    orderId: OrderId;
    timestamp: Time;
    quantity: bigint;
    price: bigint;
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
    cancelAllOpenOrders(): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    cancelSingleOrder(orderId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getActivityLog(count: bigint, page: bigint): Promise<Array<LogEntry>>;
    getBalances(): Promise<{
        icpBalance: bigint;
        ckbtcBalance: bigint;
    }>;
    getBotStatus(): Promise<boolean>;
    getConfig(): Promise<{
        spreadPips: bigint;
        orderSize: bigint;
        intervalSeconds: bigint;
        numOrders: bigint;
    }>;
    getDepositAddr(): Promise<DepositAccount>;
    getLastGrid(): Promise<Array<[string, bigint]>>;
    getOpenOrders(): Promise<Array<OrderEntry>>;
    getTradeHistory(): Promise<Array<OrderEntry>>;
    healthCheck(): Promise<boolean>;
    startBot(): Promise<void>;
    stopBot(): Promise<void>;
    updateConfig(newInterval: bigint, newSpread: bigint, newOrders: bigint, newOrderSize: bigint): Promise<void>;
}
