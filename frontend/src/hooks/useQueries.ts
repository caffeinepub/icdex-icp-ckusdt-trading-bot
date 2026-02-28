import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { OpenOrder, OrderEntry } from '@/backend';

const POLL_INTERVAL = 10_000; // 10 seconds

export function useBotStatus() {
    const { actor, isFetching } = useActor();
    return useQuery<boolean>({
        queryKey: ['botStatus'],
        queryFn: async () => {
            if (!actor) return false;
            return actor.getBotStatus();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_INTERVAL,
    });
}

export function useConfig() {
    const { actor, isFetching } = useActor();
    return useQuery<{ intervalSeconds: bigint; spreadBps: bigint; numOrders: bigint }>({
        queryKey: ['config'],
        queryFn: async () => {
            if (!actor) return { intervalSeconds: BigInt(60), spreadBps: BigInt(45), numOrders: BigInt(20) };
            return actor.getConfig();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_INTERVAL,
    });
}

export function useLastMidPrice() {
    const { actor, isFetching } = useActor();
    return useQuery<bigint>({
        queryKey: ['lastMidPrice'],
        queryFn: async () => {
            if (!actor) return BigInt(0);
            return actor.getLastMidPrice();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_INTERVAL,
    });
}

export function useLastGrid() {
    const { actor, isFetching } = useActor();
    return useQuery<Array<[string, bigint]>>({
        queryKey: ['lastGrid'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getLastGrid();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_INTERVAL,
    });
}

export function useOpenOrders() {
    const { actor, isFetching } = useActor();
    return useQuery<OpenOrder[]>({
        queryKey: ['openOrders'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getOpenOrders();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_INTERVAL,
    });
}

export function useTradeHistory() {
    const { actor, isFetching } = useActor();
    return useQuery<OrderEntry[]>({
        queryKey: ['tradeHistory'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getTradeHistory();
        },
        enabled: !!actor && !isFetching,
        refetchInterval: POLL_INTERVAL,
    });
}

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
        },
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
