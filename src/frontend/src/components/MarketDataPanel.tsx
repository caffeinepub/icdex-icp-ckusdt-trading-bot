import { useBotStatus, useMarketData } from "@/hooks/useQueries";
import { Info, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Format a bigint price value (stored as e8s) as ICP per ckBTC.
 * Always shows 8 decimal places to match the ICP/ckBTC price range (~0.00020).
 */
function formatPrice(value: bigint): string {
  const n = Number(value) / 1e8;
  if (n === 0) return "—";
  return n.toFixed(8);
}

function relativeTime(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  return `${m}m ago`;
}

export function MarketDataPanel() {
  const {
    data: marketData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useMarketData();
  const { data: isRunning } = useBotStatus();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const hasData = marketData?.hasData ?? false;
  const midPrice = marketData?.midPrice ?? null;
  const bestBid = marketData?.bestBid ?? null;
  const bestAsk = marketData?.bestAsk ?? null;
  const buyLevels = marketData?.buyLevels ?? 0;
  const sellLevels = marketData?.sellLevels ?? 0;

  const ageMs = dataUpdatedAt ? now - dataUpdatedAt : null;
  const isStale = ageMs !== null && ageMs > 30_000;

  let statusLabel = isRunning ? "LIVE" : "IDLE";
  let statusClass = isRunning
    ? "text-terminal-buy bg-terminal-buy/10 border-terminal-buy/30"
    : "text-muted-foreground bg-muted/20 border-border";
  let borderClass = isRunning ? "border-terminal-buy/20" : "border-border";

  if (isError) {
    statusLabel = "ERROR";
    statusClass =
      "text-terminal-sell bg-terminal-sell/10 border-terminal-sell/30";
    borderClass = "border-terminal-sell/20";
  } else if (isStale && hasData) {
    statusLabel = "STALE";
    statusClass =
      "text-terminal-warning bg-terminal-warning/10 border-terminal-warning/30";
    borderClass = "border-terminal-warning/20";
  }

  // Derive a human-readable error message
  const errorMessage = isError
    ? (() => {
        const msg =
          error instanceof Error ? error.message : String(error ?? "");
        if (msg.includes("IC0508") || msg.includes("stopped"))
          return "Canister is stopped — restart the bot.";
        if (msg.includes("not reachable") || msg.includes("network"))
          return "Network error — check connectivity.";
        if (msg) return msg;
        return "Failed to fetch market data.";
      })()
    : null;

  // Compute spread in pips (1 pip = 0.000001 ICP/ckBTC)
  const spreadPips =
    bestBid !== null && bestAsk !== null && bestAsk > bestBid
      ? Math.round(Number(bestAsk - bestBid) / 1e8 / 0.000001)
      : null;

  return (
    <div
      className={`terminal-card p-5 flex flex-col gap-4 border ${borderClass} transition-colors duration-500`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="terminal-label">Market Data</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${statusClass}`}
          >
            {isRunning && !isError && (
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy mr-1 animate-pulse" />
            )}
            {statusLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh market data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Error state */}
      {isError && errorMessage && (
        <div className="flex items-start gap-2 px-3 py-2 rounded bg-terminal-sell/10 border border-terminal-sell/30 text-terminal-sell text-[11px] font-mono">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* No data yet — waiting for first bot cycle */}
      {!isError && !isLoading && !hasData && (
        <div className="flex items-start gap-2 px-3 py-2 rounded bg-muted/20 border border-border/60 text-muted-foreground text-[11px] font-mono">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {isRunning
              ? "Waiting for first bot cycle to populate market data…"
              : "Start the bot to begin fetching ICP/ckBTC market data."}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !hasData && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Mid price — primary display */}
      {hasData && midPrice !== null && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Mid Price <span className="opacity-60">(ICP/ckBTC)</span>
          </span>
          <span className="text-2xl font-mono font-bold text-foreground tabular-nums tracking-tight">
            {formatPrice(midPrice)}
          </span>
          {ageMs !== null && (
            <span className="text-[10px] font-mono text-muted-foreground opacity-60">
              {relativeTime(dataUpdatedAt ?? 0)}
            </span>
          )}
        </div>
      )}

      {/* Bid / Ask / Spread */}
      {hasData && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-muted-foreground">
              Best Bid <span className="opacity-60">(ICP)</span>
            </span>
            <span className="text-sm font-mono text-terminal-buy tabular-nums">
              {bestBid !== null ? formatPrice(bestBid) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-muted-foreground">
              Best Ask <span className="opacity-60">(ICP)</span>
            </span>
            <span className="text-sm font-mono text-terminal-sell tabular-nums">
              {bestAsk !== null ? formatPrice(bestAsk) : "—"}
            </span>
          </div>
          {spreadPips !== null && (
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-mono text-muted-foreground">
                Spread
              </span>
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                {spreadPips}{" "}
                <span className="text-[10px] opacity-60">pips</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid level counts */}
      {hasData && (buyLevels > 0 || sellLevels > 0) && (
        <div className="flex gap-3 border-t border-border pt-3">
          <div className="flex-1 flex flex-col items-center gap-0.5 bg-terminal-buy/5 border border-terminal-buy/20 rounded px-2 py-1.5">
            <span className="text-[10px] font-mono text-muted-foreground">
              BUY LEVELS
            </span>
            <span className="text-base font-mono font-bold text-terminal-buy">
              {buyLevels}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5 bg-terminal-sell/5 border border-terminal-sell/20 rounded px-2 py-1.5">
            <span className="text-[10px] font-mono text-muted-foreground">
              SELL LEVELS
            </span>
            <span className="text-base font-mono font-bold text-terminal-sell">
              {sellLevels}
            </span>
          </div>
        </div>
      )}

      {/* Footer: canister source */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground opacity-50 pt-1 border-t border-border">
        <span>Source: ICDex</span>
        <span className="opacity-60">·</span>
        <span>5u2c6…cai</span>
        {isFetching && !isLoading && (
          <span className="ml-auto animate-pulse">↻</span>
        )}
      </div>
    </div>
  );
}
