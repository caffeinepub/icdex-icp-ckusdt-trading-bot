import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface backendInterface {
    getBotStatus(): Promise<boolean>;
    getConfig(): Promise<{
        intervalSeconds: bigint;
        spreadBps: bigint;
        numOrders: bigint;
    }>;
    getLastGrid(): Promise<Array<[string, bigint]>>;
    getLastMidPrice(): Promise<bigint>;
    setConfig(newInterval: bigint, newSpread: bigint, newOrders: bigint): Promise<void>;
    startBot(): Promise<void>;
    stopBot(): Promise<void>;
}
