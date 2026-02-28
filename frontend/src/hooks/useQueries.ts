import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { LogEntry, OrderEntry } from '@/backend';

// ─── Local types matching the actual backend interface ────────────────────────

export interface BotConfig {
    intervalSeconds: bigint;
    spreadBps: bigint;
    numOrders: bigint;
}

// ─── Actor interface matching backend/main.mo ─────────────────────────────────

interface TradingBotActor {
    getBotStatus(): Promise<boolean>;
    getConfig(): Promise<{ intervalSeconds: bigint; spreadBps: bigint; numOrders: bigint }>;
    getLastGrid(): Promise<Array<[string, bigint]>>;
    getTradeHistory(): Promise<Array<OrderEntry>>;
    getActivityLog(count: bigint, page: bigint): Promise<Array<LogEntry>>;
    pending(): Promise<Array<OrderEntry>>;
    startBot(): Promise<void>;
    stopBot(): Promise<void>;
    cancelAllOpenOrders(): Promise<void>;
    cancelOneOrderTest(): Promise<void>;
}

const POLL_FAST = 5_000;
const POLL_SLOW = 15_000;

// ─── Bot Status ───────────────────────────────────────────────────────────────

export function useBotStatus() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<boolean>({
        queryKey: ['botStatus'],
        queryFn: async () => {
            if (!tradingActor) return false;
            return tradingActor.getBotStatus();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_FAST,
    });
}

// ─── Bot Config ───────────────────────────────────────────────────────────────

export function useBotConfig() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<BotConfig>({
        queryKey: ['botConfig'],
        queryFn: async () => {
            if (!tradingActor) return { intervalSeconds: BigInt(60), spreadBps: BigInt(45), numOrders: BigInt(20) };
            return tradingActor.getConfig();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_SLOW,
    });
}

// ─── Start Bot ────────────────────────────────────────────────────────────────

export function useStartBot() {
    const { actor } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!tradingActor) throw new Error('Actor not initialized');
            return tradingActor.startBot();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['botStatus'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
        },
    });
}

// ─── Stop Bot ─────────────────────────────────────────────────────────────────

export function useStopBot() {
    const { actor } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!tradingActor) throw new Error('Actor not initialized');
            return tradingActor.stopBot();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['botStatus'] });
            queryClient.invalidateQueries({ queryKey: ['openOrders'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
        },
    });
}

// ─── Cancel All Open Orders ───────────────────────────────────────────────────

export function useCancelAllOrders() {
    const { actor } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!tradingActor) throw new Error('Actor not initialized');
            return tradingActor.cancelAllOpenOrders();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['openOrders'] });
            queryClient.invalidateQueries({ queryKey: ['tradeHistory'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
        },
    });
}

// ─── Last Grid (price levels) ─────────────────────────────────────────────────

export function useLastGrid() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const { data: isRunning } = useBotStatus();
    return useQuery<Array<[string, bigint]>>({
        queryKey: ['lastGrid'],
        queryFn: async () => {
            if (!tradingActor) return [];
            return tradingActor.getLastGrid();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_FAST : POLL_SLOW,
    });
}

// ─── Open Orders (pending) ────────────────────────────────────────────────────

export function useOpenOrders() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const { data: isRunning } = useBotStatus();
    return useQuery<OrderEntry[]>({
        queryKey: ['openOrders'],
        queryFn: async () => {
            if (!tradingActor) return [];
            return tradingActor.pending();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_FAST : POLL_SLOW,
        refetchOnWindowFocus: true,
    });
}

// ─── Trade History ────────────────────────────────────────────────────────────

export function useTradeHistory() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<OrderEntry[]>({
        queryKey: ['tradeHistory'],
        queryFn: async () => {
            if (!tradingActor) return [];
            return tradingActor.getTradeHistory();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_FAST,
    });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export function useActivityLog(count = 50, page = 0) {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<LogEntry[]>({
        queryKey: ['activityLog', count, page],
        queryFn: async () => {
            if (!tradingActor) return [];
            return tradingActor.getActivityLog(BigInt(count), BigInt(page));
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_FAST,
    });
}
