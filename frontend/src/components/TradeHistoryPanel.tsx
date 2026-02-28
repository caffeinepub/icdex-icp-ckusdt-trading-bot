import { History, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { useTradeHistory } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatus } from '@/backend';

function formatPrice(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '0';
    if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(8);
}

function formatQty(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '0';
    if (n >= 0.01) return n.toFixed(4);
    return n.toFixed(8);
}

function relativeTime(nanos: bigint): string {
    const ms = Number(nanos / BigInt(1_000_000));
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusBadge({ status }: { status: OrderStatus }) {
    if (status === OrderStatus.open) {
        return <span className="text-[10px] font-mono font-bold text-terminal-buy tracking-wider">OPEN</span>;
    }
    if (status === OrderStatus.filled) {
        return <span className="text-[10px] font-mono font-bold text-terminal-neutral tracking-wider">FILLED</span>;
    }
    return <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-wider">CNCLD</span>;
}

export function TradeHistoryPanel() {
    const { data: history, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useTradeHistory();

    const sorted = history
        ? [...history].sort((a, b) => (b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0))
        : [];

    const hasData = sorted.length > 0;
    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    return (
        <div className="terminal-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Trade History</span>
                    {hasData && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/40 text-muted-foreground border border-border">
                            {sorted.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full bg-muted" />
                    ))}
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-terminal-sell">Failed to load history</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-70">
                            Check canister connectivity
                        </span>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="text-xs font-mono text-terminal-buy hover:underline mt-1"
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
                            Orders will appear here once the bot runs
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[380px]">
                    {/* Table header */}
                    <div className="grid grid-cols-[4rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">TIME</span>
                        <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">PRICE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">QTY</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">STATUS</span>
                    </div>

                    {sorted.map((entry) => {
                        const isBuy = entry.side === 'buy';
                        return (
                            <div
                                key={String(entry.orderId)}
                                className={`grid grid-cols-[4rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-2 border-b border-border/40 transition-colors ${
                                    isBuy ? 'hover:bg-terminal-buy/5' : 'hover:bg-terminal-sell/5'
                                }`}
                            >
                                <span className="text-[10px] font-mono text-muted-foreground self-center truncate">
                                    {relativeTime(entry.timestamp)}
                                </span>
                                <span
                                    className={`text-xs font-mono font-semibold self-center ${
                                        isBuy ? 'text-terminal-buy' : 'text-terminal-sell'
                                    }`}
                                >
                                    {isBuy ? 'BUY' : 'SELL'}
                                </span>
                                <span
                                    className={`text-xs font-mono text-right self-center ${
                                        isBuy ? 'text-terminal-buy' : 'text-terminal-sell'
                                    }`}
                                >
                                    {formatPrice(entry.price)}
                                </span>
                                <span className="text-xs font-mono text-right self-center text-foreground/80">
                                    {formatQty(entry.quantity)}
                                </span>
                                <div className="flex justify-end items-center">
                                    <StatusBadge status={entry.status} />
                                </div>
                            </div>
                        );
                    })}
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && (
                <div className="flex items-center text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Updated: {lastUpdated}</span>
                    {hasData && (
                        <span className="ml-auto opacity-60">{sorted.length} records</span>
                    )}
                </div>
            )}
        </div>
    );
}
