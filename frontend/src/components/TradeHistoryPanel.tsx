import { History, RefreshCw, ArrowUp, ArrowDown, AlertCircle, Inbox } from 'lucide-react';
import { useTradeHistory } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Side, OrderStatus } from '@/backend';

/**
 * ICDex prices and quantities are in e8s (10^8 units = 1 token).
 * Price: ckUSDT per ICP, scaled by 10^8.
 * Quantity: ICP amount scaled by 10^8.
 */
function formatPrice(value: bigint): string {
    const num = Number(value);
    if (num === 0) return '0';
    const humanPrice = num / 1e8;
    if (humanPrice >= 1000) {
        return humanPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (humanPrice >= 1) {
        return humanPrice.toFixed(4);
    }
    return humanPrice.toFixed(8);
}

function formatQuantity(value: bigint): string {
    const num = Number(value);
    if (num === 0) return '0';
    const humanQty = num / 1e8;
    if (humanQty >= 1000) {
        return humanQty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (humanQty >= 0.01) {
        return humanQty.toFixed(4);
    }
    return humanQty.toFixed(8);
}

/**
 * Timestamp from backend is in nanoseconds (Time.Time = Int in Motoko).
 * Convert to milliseconds for JS Date.
 */
function formatTimestamp(nanos: bigint): string {
    const ms = Number(nanos / BigInt(1_000_000));
    const date = new Date(ms);
    const now = Date.now();
    const diffSec = Math.floor((now - ms) / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function StatusBadge({ status }: { status: OrderStatus }) {
    if (status === OrderStatus.open) {
        return (
            <span className="inline-flex items-center text-xs font-mono font-semibold text-terminal-buy tracking-wider">
                OPEN
            </span>
        );
    }
    if (status === OrderStatus.filled) {
        return (
            <span className="inline-flex items-center text-xs font-mono font-semibold text-terminal-neutral tracking-wider">
                FILLED
            </span>
        );
    }
    // cancelled
    return (
        <span className="inline-flex items-center text-xs font-mono font-semibold text-muted-foreground tracking-wider">
            CNCLD
        </span>
    );
}

export function TradeHistoryPanel() {
    const { data: history, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useTradeHistory();

    // Sort most recent first by timestamp (nanoseconds bigint)
    const sorted = history
        ? [...history].sort((a, b) => {
              if (b.timestamp > a.timestamp) return 1;
              if (b.timestamp < a.timestamp) return -1;
              return 0;
          })
        : [];

    const buyCount = sorted.filter((o) => o.side === Side.buy).length;
    const sellCount = sorted.filter((o) => o.side === Side.sell).length;
    const hasData = sorted.length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Trade History
                    </span>
                    {hasData && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <Badge
                                variant="outline"
                                className="text-xs font-mono px-1.5 py-0 h-5 text-terminal-buy border-terminal-buy/40 bg-terminal-buy/10"
                            >
                                {buyCount} BUY
                            </Badge>
                            <Badge
                                variant="outline"
                                className="text-xs font-mono px-1.5 py-0 h-5 text-terminal-sell border-terminal-sell/40 bg-terminal-sell/10"
                            >
                                {sellCount} SELL
                            </Badge>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh trade history"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full bg-muted" />
                    ))}
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-terminal-sell">Failed to fetch history</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Check canister connectivity and try again
                        </span>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="text-xs font-mono text-terminal-buy hover:text-terminal-buy/80 transition-colors mt-1"
                    >
                        Retry
                    </button>
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <Inbox className="w-7 h-7 text-muted-foreground opacity-40" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-muted-foreground">No trade history</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Orders placed by the bot will appear here
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[360px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[5.5rem_3.5rem_1fr_1fr_4rem] gap-2 px-3 py-2 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-xs font-mono text-muted-foreground">TIME</span>
                        <span className="text-xs font-mono text-muted-foreground">SIDE</span>
                        <span className="text-xs font-mono text-muted-foreground text-right">PRICE (ckUSDT)</span>
                        <span className="text-xs font-mono text-muted-foreground text-right">QTY (ICP)</span>
                        <span className="text-xs font-mono text-muted-foreground text-right">STATUS</span>
                    </div>

                    {/* Rows */}
                    <div className="flex flex-col">
                        {sorted.map((entry, idx) => {
                            const isBuy = entry.side === Side.buy;
                            return (
                                <div
                                    key={`${String(entry.orderId)}-${idx}`}
                                    className={`grid grid-cols-[5.5rem_3.5rem_1fr_1fr_4rem] gap-2 px-3 py-2 border-b border-border/40 transition-colors ${
                                        isBuy
                                            ? 'hover:bg-terminal-buy/5'
                                            : 'hover:bg-terminal-sell/5'
                                    }`}
                                >
                                    {/* Timestamp */}
                                    <span className="text-xs font-mono text-muted-foreground self-center truncate">
                                        {formatTimestamp(entry.timestamp)}
                                    </span>

                                    {/* Side */}
                                    <div className="flex items-center">
                                        <span
                                            className={`inline-flex items-center gap-1 text-xs font-mono font-semibold tracking-wider ${
                                                isBuy ? 'text-terminal-buy' : 'text-terminal-sell'
                                            }`}
                                        >
                                            {isBuy ? (
                                                <ArrowUp className="w-3 h-3" />
                                            ) : (
                                                <ArrowDown className="w-3 h-3" />
                                            )}
                                            {isBuy ? 'BUY' : 'SELL'}
                                        </span>
                                    </div>

                                    {/* Price */}
                                    <span
                                        className={`text-sm font-mono font-medium text-right self-center ${
                                            isBuy ? 'text-terminal-buy' : 'text-terminal-sell'
                                        }`}
                                    >
                                        {formatPrice(entry.price)}
                                    </span>

                                    {/* Quantity */}
                                    <span className="text-sm font-mono text-right self-center text-foreground/80">
                                        {formatQuantity(entry.quantity)}
                                    </span>

                                    {/* Status */}
                                    <div className="flex items-center justify-end">
                                        <StatusBadge status={entry.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Footer */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                {lastUpdated ? (
                    <span>Updated: {lastUpdated}</span>
                ) : (
                    <span>Not yet updated</span>
                )}
                {hasData && (
                    <span className="ml-auto opacity-60">{sorted.length} total entries</span>
                )}
            </div>
        </div>
    );
}
