import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { OrderEntry, LogEntry } from '@/backend';
import { OrderStatus } from '@/backend';

const POLL_MARKET_IDLE    = 10_000;  // 10s when bot is stopped
const POLL_MARKET_RUNNING = 3_000;   // 3s when bot is running (catch state transitions fast)
const POLL_ORDERS_IDLE    = 10_000;  // 10s for orders when idle
const POLL_ORDERS_RUNNING = 5_000;   // 5s for orders when running
const POLL_LOG_IDLE       = 15_000;  // 15s for activity log when idle
const POLL_LOG_RUNNING    = 5_000;   // 5s for activity log when running (surface errors quickly)

// ─── Bot Status ──────────────────────────────────────────────────────────────

export function useBotStatus() {
    const { actor, isFetching } = useActor();
    return useQuery<boolean>({
        queryKey: ['botStatus'],
        queryFn: async () => {
            if (!actor) return false;
            return actor.getBotStatus();
        },
        enabled: !!actor && !isFetching,
        // Always poll at the faster rate so we catch transitions promptly
        refetchInterval: POLL_MARKET_RUNNING,
    });
}

// ─── Config ──────────────────────────────────────────────────────────────────

export function useConfig() {
    const { actor, isFetching } = useActor();
    return useQuery<{ intervalSeconds: bigint; spreadBps: bigint; numOrders: bigint }>({
        queryKey: ['config'],
        queryFn: async () => {
            if (!actor) return { intervalSeconds: BigInt(60), spreadBps: BigInt(45), numOrders: BigInt(20) };
            return actor.getConfig();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useSetConfig() {
    const { actor } = useActor();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            intervalSeconds,
            spreadBps,
            numOrders,
        }: {
            intervalSeconds: number;
            spreadBps: number;
            numOrders: number;
        }) => {
            if (!actor) throw new Error('Actor not initialized');
            return actor.setConfig(BigInt(intervalSeconds), BigInt(spreadBps), BigInt(numOrders));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
        },
    });
}

// ─── Market Data ─────────────────────────────────────────────────────────────

export function useLastMidPrice() {
    const { actor, isFetching } = useActor();
    return useQuery<bigint>({
        queryKey: ['lastMidPrice'],
        queryFn: async () => {
            if (!actor) return BigInt(0);
            return actor.getLastMidPrice();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_MARKET_IDLE,
    });
}

// ─── Grid Preview ─────────────────────────────────────────────────────────────

export function useLastGrid() {
    const { actor, isFetching } = useActor();
    const { data: isRunning } = useBotStatus();
    return useQuery<Array<[string, bigint]>>({
        queryKey: ['lastGrid'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getLastGrid();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_ORDERS_RUNNING : POLL_ORDERS_IDLE,
    });
}

// ─── Trade History ────────────────────────────────────────────────────────────

export function useTradeHistory() {
    const { actor, isFetching } = useActor();
    const { data: isRunning } = useBotStatus();
    return useQuery<OrderEntry[]>({
        queryKey: ['tradeHistory'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getTradeHistory();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_ORDERS_RUNNING : POLL_ORDERS_IDLE,
    });
}

// ─── Open Orders ──────────────────────────────────────────────────────────────

export function useOpenOrders() {
    const { actor, isFetching } = useActor();
    const { data: isRunning } = useBotStatus();
    return useQuery<OrderEntry[]>({
        queryKey: ['openOrders'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getOpenOrders();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_ORDERS_RUNNING : POLL_ORDERS_IDLE,
    });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export function useActivityLog() {
    const { actor, isFetching } = useActor();
    const { data: isRunning } = useBotStatus();
    return useQuery<LogEntry[]>({
        queryKey: ['activityLog'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getActivityLog();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: isRunning ? POLL_LOG_RUNNING : POLL_LOG_IDLE,
    });
}

// ─── Bot Controls ─────────────────────────────────────────────────────────────

export function useStartBot() {
    const { actor } = useActor();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!actor) throw new Error('Actor not initialized');
            return actor.startBot();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['botStatus'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
            queryClient.invalidateQueries({ queryKey: ['openOrders'] });
        },
    });
}

export function useStopBot() {
    const { actor } = useActor();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!actor) throw new Error('Actor not initialized');
            return actor.stopBot();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['botStatus'] });
            queryClient.invalidateQueries({ queryKey: ['activityLog'] });
            queryClient.invalidateQueries({ queryKey: ['openOrders'] });
        },
    });
}

// ─── Derived: Order Errors ────────────────────────────────────────────────────

export interface OrderError {
    orderId: bigint;
    side: 'buy' | 'sell';
    timestamp: number;
    price: bigint;
    quantity: bigint;
}

/**
 * Derives recently cancelled orders from trade history (last 5 minutes).
 * Used to surface unexpected cancellations in the BotControlPanel.
 */
export function useOrderErrors() {
    const { data: history, isLoading } = useTradeHistory();

    const errors: OrderError[] = [];

    if (history) {
        const fiveMinAgoNs = BigInt(Date.now() - 5 * 60 * 1000) * BigInt(1_000_000);
        for (const entry of history) {
            if (entry.status === OrderStatus.cancelled && entry.timestamp > fiveMinAgoNs) {
                errors.push({
                    orderId: entry.orderId,
                    side: entry.side === 'buy' ? 'buy' : 'sell',
                    timestamp: Number(entry.timestamp / BigInt(1_000_000)),
                    price: entry.price,
                    quantity: entry.quantity,
                });
            }
        }
        errors.sort((a, b) => b.timestamp - a.timestamp);
    }

    return { errors, isLoading, hasErrors: errors.length > 0 };
}

// ─── Derived: Order Placement Errors from Activity Log ───────────────────────

export interface PlacementError {
    id: string;
    message: string;
    timestamp: number;
}

/**
 * Extracts recent order placement errors from the activity log (last 10 minutes).
 * These are log entries with eventType === 'error' emitted by the trading loop.
 */
export function useOrderPlacementErrors() {
    const { data: log, isLoading } = useActivityLog();

    const errors: PlacementError[] = [];

    if (log) {
        const tenMinAgoNs = BigInt(Date.now() - 10 * 60 * 1000) * BigInt(1_000_000);
        log.forEach((entry, index) => {
            if (entry.eventType === 'error' && entry.timestamp > tenMinAgoNs) {
                errors.push({
                    id: `${String(entry.timestamp)}-${index}`,
                    message: entry.message,
                    timestamp: Number(entry.timestamp / BigInt(1_000_000)),
                });
            }
        });
        errors.sort((a, b) => b.timestamp - a.timestamp);
    }

    return { errors, isLoading, hasErrors: errors.length > 0 };
}
