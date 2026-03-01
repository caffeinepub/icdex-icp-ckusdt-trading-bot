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
    healthCheck(): Promise<boolean>;
}

const POLL_FAST = 5_000;
const POLL_SLOW = 15_000;

// ─── Helper: detect IC0508 (canister stopped) errors ─────────────────────────

function isCanisterStoppedError(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err);
    return (
        msg.includes('IC0508') ||
        msg.includes('reject_code: 5') ||
        msg.includes('reject_code":5') ||
        msg.includes('Canister') && msg.includes('is stopped') ||
        (typeof err === 'object' && err !== null && 'reject_code' in err && (err as { reject_code: unknown }).reject_code === 5)
    );
}

// ─── Helper: run health check before a mutation ───────────────────────────────

async function runHealthCheck(actor: TradingBotActor): Promise<void> {
    try {
        const alive = await actor.healthCheck();
        if (!alive) {
            throw new Error('The canister is not reachable. Please try again later.');
        }
    } catch (err) {
        if (err instanceof Error && err.message.includes('not reachable')) {
            throw err;
        }
        // healthCheck itself threw — canister is unreachable
        throw new Error('The canister is not reachable. Please try again later.');
    }
}

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

            // Pre-check: verify canister is reachable before attempting startBot
            await runHealthCheck(tradingActor);

            try {
                return await tradingActor.startBot();
            } catch (err) {
                if (isCanisterStoppedError(err)) {
                    throw new Error('The canister is currently stopped. Please wait and try again.');
                }
                throw err;
            }
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

            // Pre-check: verify canister is reachable before attempting stopBot
            await runHealthCheck(tradingActor);

            try {
                return await tradingActor.stopBot();
            } catch (err) {
                if (isCanisterStoppedError(err)) {
                    throw new Error('The canister is currently stopped. Please wait and try again.');
                }
                throw err;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['botStatus'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
            // Force immediate refetch of open orders and trade history after stop
            queryClient.refetchQueries({ queryKey: ['openOrders'] });
            queryClient.refetchQueries({ queryKey: ['tradeHistory'] });
            queryClient.refetchQueries({ queryKey: ['lastGrid'] });
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
            // Invalidate stale data and immediately refetch to reflect cleared orders
            queryClient.invalidateQueries({ queryKey: ['openOrders'] });
            queryClient.invalidateQueries({ queryKey: ['tradeHistory'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
            // Force immediate refetch so UI clears without waiting for next poll
            queryClient.refetchQueries({ queryKey: ['openOrders'] });
            queryClient.refetchQueries({ queryKey: ['tradeHistory'] });
            queryClient.refetchQueries({ queryKey: ['activityLog'] });
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
