import type { LogEntry, OrderEntry } from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

// ─── Local types matching the actual backend interface ────────────────────────

export interface BotConfig {
  intervalSeconds: bigint;
  spreadPips: bigint;
  numOrders: bigint;
  orderSize: bigint;
}

export interface MarketData {
  midPrice: bigint | null;
  bestBid: bigint | null;
  bestAsk: bigint | null;
  buyLevels: number;
  sellLevels: number;
  hasData: boolean;
  source: "grid" | "empty";
}

export interface Balances {
  icpBalance: bigint;
  ckbtcBalance: bigint;
}

// ─── Actor interface matching backend/main.mo ─────────────────────────────────

interface TradingBotActor {
  getBotStatus(): Promise<boolean>;
  getConfig(): Promise<{
    intervalSeconds: bigint;
    spreadPips: bigint;
    numOrders: bigint;
    orderSize: bigint;
  }>;
  getLastGrid(): Promise<Array<[string, bigint]>>;
  getTradeHistory(): Promise<Array<OrderEntry>>;
  getActivityLog(count: bigint, page: bigint): Promise<Array<LogEntry>>;
  pending(): Promise<Array<OrderEntry>>;
  getOpenOrders(): Promise<Array<OrderEntry>>;
  startBot(): Promise<void>;
  stopBot(): Promise<void>;
  updateConfig(
    newInterval: bigint,
    newSpread: bigint,
    newOrders: bigint,
    newOrderSize: bigint,
  ): Promise<void>;
  cancelAllOpenOrders(): Promise<void>;
  cancelOneOrderTest(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getBalances(): Promise<{ icpBalance: bigint; ckbtcBalance: bigint }>;
  depositCkBTC(): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  >;
}

const POLL_FAST = 5_000;
const POLL_SLOW = 15_000;
const POLL_BALANCES = 30_000;

// ─── Helper: detect IC0508 (canister stopped) errors ─────────────────────────

function isCanisterStoppedError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err);
  return (
    msg.includes("IC0508") ||
    msg.includes("reject_code: 5") ||
    msg.includes('reject_code":5') ||
    (msg.includes("Canister") && msg.includes("is stopped")) ||
    (typeof err === "object" &&
      err !== null &&
      "reject_code" in err &&
      (err as { reject_code: unknown }).reject_code === 5)
  );
}

// ─── Helper: run health check before a mutation ───────────────────────────────

async function runHealthCheck(actor: TradingBotActor): Promise<void> {
  try {
    const alive = await actor.healthCheck();
    if (!alive) {
      throw new Error("The canister is not reachable. Please try again later.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("not reachable")) {
      throw err;
    }
    throw new Error("The canister is not reachable. Please try again later.");
  }
}

// ─── Bot Status ───────────────────────────────────────────────────────────────

export function useBotStatus() {
  const { actor, isFetching } = useActor();
  const tradingActor = actor as unknown as TradingBotActor | null;
  return useQuery<boolean>({
    queryKey: ["botStatus"],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
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
    queryKey: ["botConfig"],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
      return tradingActor.getConfig();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: POLL_SLOW,
    retry: 2,
  });
}

// ─── Update Config ────────────────────────────────────────────────────────────

export function useUpdateConfig() {
  const { actor } = useActor();
  const tradingActor = actor as unknown as TradingBotActor | null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      spreadPips: number;
      numOrders: number;
      intervalSeconds: number;
      orderSize: number;
    }) => {
      if (!tradingActor) throw new Error("Actor not initialized");
      await tradingActor.updateConfig(
        BigInt(config.intervalSeconds),
        BigInt(config.spreadPips),
        BigInt(config.numOrders),
        BigInt(config.orderSize),
      );
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botConfig"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
    },
  });
}

// ─── Start Bot ────────────────────────────────────────────────────────────────

export function useStartBot() {
  const { actor } = useActor();
  const tradingActor = actor as unknown as TradingBotActor | null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!tradingActor) throw new Error("Actor not initialized");
      await runHealthCheck(tradingActor);
      try {
        return await tradingActor.startBot();
      } catch (err) {
        if (isCanisterStoppedError(err)) {
          throw new Error(
            "The canister is currently stopped. Please wait and try again.",
          );
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botStatus"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
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
      if (!tradingActor) throw new Error("Actor not initialized");
      await runHealthCheck(tradingActor);
      try {
        return await tradingActor.stopBot();
      } catch (err) {
        if (isCanisterStoppedError(err)) {
          throw new Error(
            "The canister is currently stopped. Please wait and try again.",
          );
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botStatus"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
      queryClient.refetchQueries({ queryKey: ["openOrders"] });
      queryClient.refetchQueries({ queryKey: ["tradeHistory"] });
      queryClient.refetchQueries({ queryKey: ["lastGrid"] });
      queryClient.refetchQueries({ queryKey: ["marketData"] });
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
      if (!tradingActor) throw new Error("Actor not initialized");
      return tradingActor.cancelAllOpenOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openOrders"] });
      queryClient.invalidateQueries({ queryKey: ["tradeHistory"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
      queryClient.refetchQueries({ queryKey: ["openOrders"] });
      queryClient.refetchQueries({ queryKey: ["tradeHistory"] });
      queryClient.refetchQueries({ queryKey: ["activityLog"] });
    },
  });
}

// ─── Last Grid (price levels) ─────────────────────────────────────────────────

export function useLastGrid() {
  const { actor, isFetching } = useActor();
  const tradingActor = actor as unknown as TradingBotActor | null;
  const { data: isRunning } = useBotStatus();
  return useQuery<Array<[string, bigint]>>({
    queryKey: ["lastGrid"],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
      const result = await tradingActor.getLastGrid();
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
    queryKey: ["marketData"],
    queryFn: async (): Promise<MarketData> => {
      if (!tradingActor) throw new Error("Actor not ready");

      const grid = await tradingActor.getLastGrid();

      if (!grid || grid.length === 0) {
        return {
          midPrice: null,
          bestBid: null,
          bestAsk: null,
          buyLevels: 0,
          sellLevels: 0,
          hasData: false,
          source: "empty",
        };
      }

      const buys = grid
        .filter(([side]) => side === "buy")
        .map(([, price]) => price)
        .sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

      const sells = grid
        .filter(([side]) => side === "sell")
        .map(([, price]) => price)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

      const bestBid = buys.length > 0 ? buys[0] : null;
      const bestAsk = sells.length > 0 ? sells[0] : null;
      const midPrice =
        bestBid !== null && bestAsk !== null
          ? (bestBid + bestAsk) / BigInt(2)
          : (bestBid ?? bestAsk ?? null);

      const hasData = midPrice !== null && midPrice > BigInt(0);

      return {
        midPrice,
        bestBid,
        bestAsk,
        buyLevels: buys.length,
        sellLevels: sells.length,
        hasData,
        source: "grid",
      };
    },
    enabled: !!actor && !isFetching,
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
    queryKey: ["openOrders"],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
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
    queryKey: ["tradeHistory"],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
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
    queryKey: ["activityLog", count, page],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
      const result = await tradingActor.getActivityLog(
        BigInt(count),
        BigInt(page),
      );
      return result ?? [];
    },
    enabled: !!actor && !isFetching,
    refetchInterval: POLL_FAST,
    retry: 2,
  });
}

// ─── Balances (ICP + ckBTC) ───────────────────────────────────────────────────

export function useBalances() {
  const { actor, isFetching } = useActor();
  const tradingActor = actor as unknown as TradingBotActor | null;
  return useQuery<Balances>({
    queryKey: ["balances"],
    queryFn: async () => {
      if (!tradingActor) throw new Error("Actor not ready");
      const result = await tradingActor.getBalances();
      return {
        icpBalance: result.icpBalance,
        ckbtcBalance: result.ckbtcBalance,
      };
    },
    enabled: !!actor && !isFetching,
    refetchInterval: POLL_BALANCES,
    retry: 2,
    staleTime: 20_000,
  });
}

// ─── Deposit ckBTC to ICDex ───────────────────────────────────────────────────

export function useDepositCkBTC() {
  const { actor } = useActor();
  const tradingActor = actor as unknown as TradingBotActor | null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!tradingActor) throw new Error("Actor not initialized");
      const result = await tradingActor.depositCkBTC();
      if (result.__kind__ === "err") {
        throw new Error(result.err);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
    },
  });
}
