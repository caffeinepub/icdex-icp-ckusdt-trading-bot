import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { LogEntry, OrderEntry } from '@/backend';

// ─── Local types matching the actual backend interface ────────────────────────

export interface BotConfig {
    intervalSeconds: bigint;
    spreadBps: bigint;
    numOrders: bigint;
}

export interface MarketData {
    midPrice: bigint | null;
    bestBid: bigint | null;
    bestAsk: bigint | null;
    buyLevels: number;
    sellLevels: number;
    hasData: boolean;
    source: 'grid' | 'empty';
}

// ─── Actor interface matching backend/main.mo ─────────────────────────────────

interface TradingBotActor {
    getBotStatus(): Promise<boolean>;
    getConfig(): Promise<{ intervalSeconds: bigint; spreadBps: bigint; numOrders: bigint }>;
    getLastGrid(): Promise<Array<[string, bigint]>>;
    getTradeHistory(): Promise<Array<OrderEntry>>;
    getActivityLog(count: bigint, page: bigint): Promise<Array<LogEntry>>;
    pending(): Promise<Array<OrderEntry>>;
    getOpenOrders(): Promise<Array<OrderEntry>>;
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
            if (!tradingActor) throw new Error('Actor not ready');
            return tradingActor.getBotStatus();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_FAST,
        retry: 2,
    });
}

// ─── Bot Config ───────────────────────────────────────────────────────────────

export function useBotConfig() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<BotConfig>({
        queryKey: ['botConfig'],
        queryFn: async () => {
            if (!tradingActor) throw new Error('Actor not ready');
            return tradingActor.getConfig();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_SLOW,
        retry: 2,
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
            queryClient.refetchQueries({ queryKey: ['marketData'] });
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
            if (!tradingActor) throw new Error('Actor not ready');
            const result = await tradingActor.getLastGrid();
            // Always return the array (may be empty if no grid has been generated yet)
            return result ?? [];
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_FAST : POLL_SLOW,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
        staleTime: 3_000,
    });
}

// ─── Market Data (derived from grid + live polling) ───────────────────────────

export function useMarketData() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const { data: isRunning } = useBotStatus();

    return useQuery<MarketData>({
        queryKey: ['marketData'],
        queryFn: async (): Promise<MarketData> => {
            if (!tradingActor) throw new Error('Actor not ready');

            // Fetch the last grid from the backend
            const grid = await tradingActor.getLastGrid();

            if (!grid || grid.length === 0) {
                return { midPrice: null, bestBid: null, bestAsk: null, buyLevels: 0, sellLevels: 0, hasData: false, source: 'empty' };
            }

            const buys = grid
                .filter(([side]) => side === 'buy')
                .map(([, price]) => price)
                .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

            const sells = grid
                .filter(([side]) => side === 'sell')
                .map(([, price]) => price)
                .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

            const bestBid = buys.length > 0 ? buys[0] : null;
            const bestAsk = sells.length > 0 ? sells[0] : null;
            const midPrice = bestBid !== null && bestAsk !== null
                ? (bestBid + bestAsk) / BigInt(2)
                : bestBid ?? bestAsk ?? null;

            const hasData = midPrice !== null && midPrice > BigInt(0);

            return {
                midPrice,
                bestBid,
                bestAsk,
                buyLevels: buys.length,
                sellLevels: sells.length,
                hasData,
                source: 'grid',
            };
        },
        enabled: !!actor && !isFetching,
        // Poll faster when bot is running or when we have no data yet (to catch first cycle)
        refetchInterval: isRunning ? POLL_FAST : POLL_SLOW,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        staleTime: 3_000,
    });
}

// ─── Open Orders ─────────────────────────────────────────────────────────────

export function useOpenOrders() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    const { data: isRunning } = useBotStatus();
    return useQuery<OrderEntry[]>({
        queryKey: ['openOrders'],
        queryFn: async () => {
            if (!tradingActor) throw new Error('Actor not ready');
            const result = await tradingActor.getOpenOrders();
            return result ?? [];
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_FAST : POLL_SLOW,
        refetchOnWindowFocus: true,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
        staleTime: 2_000,
    });
}

// ─── Trade History ────────────────────────────────────────────────────────────

export function useTradeHistory() {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<OrderEntry[]>({
        queryKey: ['tradeHistory'],
        queryFn: async () => {
            if (!tradingActor) throw new Error('Actor not ready');
            const result = await tradingActor.getTradeHistory();
            return result ?? [];
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_FAST,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
        staleTime: 2_000,
    });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export function useActivityLog(count = 50, page = 0) {
    const { actor, isFetching } = useActor();
    const tradingActor = actor as unknown as TradingBotActor | null;
    return useQuery<LogEntry[]>({
        queryKey: ['activityLog', count, page],
        queryFn: async () => {
            if (!tradingActor) throw new Error('Actor not ready');
            const result = await tradingActor.getActivityLog(BigInt(count), BigInt(page));
            return result ?? [];
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_FAST,
        retry: 2,
    });
}
