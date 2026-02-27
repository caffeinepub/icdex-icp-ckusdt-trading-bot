import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface OpenOrder {
    side: Side;
    orderId: bigint;
    quantity: bigint;
    price: bigint;
}
export enum Side {
    buy = "buy",
    sell = "sell"
}
export interface backendInterface {
    cancelAllOpenOrders(): Promise<void>;
    cancelOneOrderTest(): Promise<void>;
    getBotStatus(): Promise<boolean>;
    getConfig(): Promise<{
        intervalSeconds: bigint;
        spreadBps: bigint;
        numOrders: bigint;
    }>;
    getLastGrid(): Promise<Array<[string, bigint]>>;
    getLastMidPrice(): Promise<bigint>;
    getOpenOrders(): Promise<Array<OpenOrder>>;
    setConfig(newInterval: bigint, newSpread: bigint, newOrders: bigint): Promise<void>;
    startBot(): Promise<void>;
    stopBot(): Promise<void>;
}
