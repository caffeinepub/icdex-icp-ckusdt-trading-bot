import type { OrderEntry } from "@/backend";
import { OrderStatus, Side } from "@/backend";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTradeHistory } from "@/hooks/useQueries";
import { AlertCircle, History, Inbox, Loader2, RefreshCw } from "lucide-react";

function formatPrice(value: bigint): string {
  const n = Number(value) / 1e8;
  if (n === 0) return "0";
  if (n >= 1000)
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(8);
}

function formatQty(value: bigint): string {
  const n = Number(value) / 1e8;
  if (n === 0) return "0";
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(8);
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const date = new Date(ms);
  const now = Date.now();
  const diffMs = now - ms;

  if (diffMs < 60_000) {
    const secs = Math.floor(diffMs / 1000);
    return secs <= 1 ? "just now" : `${secs}s ago`;
  }
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `${mins}m ago`;
  }
  if (diffMs < 86_400_000) {
    const hrs = Math.floor(diffMs / 3_600_000);
    return `${hrs}h ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusLabel(status: OrderStatus): { text: string; className: string } {
  switch (status) {
    case OrderStatus.filled:
      return { text: "FILLED", className: "text-terminal-buy" };
    case OrderStatus.cancelled:
      return { text: "CANCELLED", className: "text-muted-foreground" };
    case OrderStatus.open:
      return { text: "OPEN", className: "text-terminal-neutral" };
    default:
      return {
        text: String(status).toUpperCase(),
        className: "text-muted-foreground",
      };
  }
}

function TradeRow({ entry }: { entry: OrderEntry }) {
  const isBuy = entry.side === Side.buy;
  const sideClass = isBuy ? "text-terminal-buy" : "text-terminal-sell";
  const sideLabel = isBuy ? "BUY" : "SELL";
  const { text: statusText, className: statusClass } = statusLabel(
    entry.status,
  );

  return (
    <div className="grid grid-cols-[3.5rem_1fr_1fr_3.5rem_4rem] gap-2 px-3 py-2 border-b border-border/40 hover:bg-muted/20 transition-colors">
      <span
        className={`text-[10px] font-mono font-semibold self-center ${sideClass}`}
      >
        {sideLabel}
      </span>
      <span className="text-xs font-mono text-right self-center text-foreground tabular-nums">
        {formatPrice(entry.price)}
      </span>
      <span className="text-xs font-mono text-right self-center text-foreground/80 tabular-nums">
        {formatQty(entry.quantity)}
      </span>
      <span
        className={`text-[10px] font-mono self-center text-right ${statusClass}`}
      >
        {statusText}
      </span>
      <span className="text-[10px] font-mono text-right self-center text-muted-foreground">
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );
}

export function TradeHistoryPanel() {
  const {
    data: trades,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
    fetchStatus,
  } = useTradeHistory();

  // isLoading is true only on the very first fetch (no cached data yet)
  const isInitialLoading = isLoading && fetchStatus === "fetching";

  // Sort reverse-chronological (newest first)
  const sortedTrades = [...(trades ?? [])].sort((a, b) => {
    if (b.timestamp > a.timestamp) return 1;
    if (b.timestamp < a.timestamp) return -1;
    return 0;
  });

  const hasData = sortedTrades.length > 0;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour12: false })
    : null;

  return (
    <div className="terminal-card p-5 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="terminal-label">Trade History</span>
          {hasData && !isInitialLoading && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/40 text-muted-foreground border border-border">
              {sortedTrades.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh trade history"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Loading state */}
      {isInitialLoading ? (
        <div className="flex flex-col gap-2">
          {["a", "b", "c", "d", "e", "f"].map((id) => (
            <Skeleton key={`skeleton-${id}`} className="h-8 w-full bg-muted" />
          ))}
        </div>
      ) : isError ? (
        /* Error state */
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-mono text-terminal-sell">
              Failed to fetch history
            </span>
            <span className="text-xs font-mono text-muted-foreground opacity-70">
              {error instanceof Error
                ? error.message
                : "Check canister connectivity"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-mono text-terminal-buy hover:underline mt-1"
          >
            Retry
          </button>
        </div>
      ) : !hasData ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center flex-1">
          <Inbox className="w-7 h-7 text-muted-foreground opacity-40" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-mono text-muted-foreground">
              No trade history
            </span>
            <span className="text-xs font-mono text-muted-foreground opacity-60 max-w-[200px]">
              Completed and cancelled orders will appear here
            </span>
          </div>
          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground opacity-60 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Checking…</span>
            </div>
          )}
        </div>
      ) : (
        /* Table */
        <ScrollArea className="flex-1 max-h-[380px]">
          {/* Table header */}
          <div className="grid grid-cols-[3.5rem_1fr_1fr_3.5rem_4rem] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
            <span className="text-[10px] font-mono text-muted-foreground">
              SIDE
            </span>
            <span className="text-[10px] font-mono text-muted-foreground text-right">
              PRICE (ckUSDT)
            </span>
            <span className="text-[10px] font-mono text-muted-foreground text-right">
              QTY (ICP)
            </span>
            <span className="text-[10px] font-mono text-muted-foreground text-right">
              STATUS
            </span>
            <span className="text-[10px] font-mono text-muted-foreground text-right">
              TIME
            </span>
          </div>

          {sortedTrades.map((trade, i) => (
            <TradeRow key={`${trade.orderId}-${i}`} entry={trade} />
          ))}
        </ScrollArea>
      )}

      {/* Footer */}
      {lastUpdated && !isInitialLoading && (
        <div className="flex items-center text-xs font-mono text-muted-foreground pt-1 border-t border-border">
          <span>Updated: {lastUpdated}</span>
          {hasData && (
            <span className="ml-auto opacity-60">
              {sortedTrades.length} records
            </span>
          )}
        </div>
      )}
    </div>
  );
}
