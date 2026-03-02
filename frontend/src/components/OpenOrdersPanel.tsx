import { ListOrdered, RefreshCw, Inbox, AlertCircle, XCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useOpenOrders, useCancelAllOrders } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { OrderEntry } from '@/backend';
import { Side } from '@/backend';

/**
 * Format a bigint price value (stored as e8s) as ICP per ckBTC.
 * Always shows at least 4 decimal places for ICP-denominated prices.
 */
function formatPrice(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '0.0000';
    if (n >= 10_000) return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(8);
}

/**
 * Format a bigint quantity value (stored as e8s) as ckBTC with 8 decimal places.
 */
function formatQty(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '0.00000000';
    return n.toFixed(8);
}

function formatTimestamp(ns: bigint): string {
    const ms = Number(ns / BigInt(1_000_000));
    const now = Date.now();
    const diffMs = now - ms;
    if (diffMs < 60_000) {
        const secs = Math.floor(diffMs / 1000);
        return secs <= 1 ? 'just now' : `${secs}s ago`;
    }
    if (diffMs < 3_600_000) {
        const mins = Math.floor(diffMs / 60_000);
        return `${mins}m ago`;
    }
    return new Date(ms).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function OrderRow({ entry, index, dimmed }: { entry: OrderEntry; index: number; dimmed?: boolean }) {
    const isBuy = entry.side === Side.buy;
    return (
        <div className={`grid grid-cols-[2.5rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-2 border-b border-border/40 hover:bg-muted/20 transition-colors ${dimmed ? 'opacity-30' : ''}`}>
            <span className="text-[10px] font-mono text-muted-foreground self-center">
                #{index + 1}
            </span>
            <span className={`text-[10px] font-mono font-semibold self-center ${isBuy ? 'text-terminal-buy' : 'text-terminal-sell'}`}>
                {isBuy ? 'BUY' : 'SELL'}
            </span>
            <span className={`text-xs font-mono text-right self-center tabular-nums ${isBuy ? 'text-terminal-buy' : 'text-terminal-sell'}`}>
                {formatPrice(entry.price)}
            </span>
            <span className="text-xs font-mono text-right self-center text-foreground/80 tabular-nums">
                {formatQty(entry.quantity)}
            </span>
            <span className="text-[10px] font-mono text-right self-center text-muted-foreground">
                {formatTimestamp(entry.timestamp)}
            </span>
        </div>
    );
}

export function OpenOrdersPanel() {
    const {
        data: orders,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
        fetchStatus,
    } = useOpenOrders();
    const cancelAll = useCancelAllOrders();

    // isLoading is true only on the very first fetch (no cached data yet)
    const isInitialLoading = isLoading && fetchStatus === 'fetching';

    const allOrders = orders ?? [];
    const hasData = allOrders.length > 0;
    const isCancelling = cancelAll.isPending;
    const justCancelled = cancelAll.isSuccess && !hasData;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    // Sort: sells descending (highest ask first), then buys descending
    const sortedOrders = [...allOrders].sort((a, b) => {
        const aSell = a.side === Side.sell;
        const bSell = b.side === Side.sell;
        if (aSell && !bSell) return -1;
        if (!aSell && bSell) return 1;
        return Number(b.price - a.price);
    });

    const buyCount = allOrders.filter(o => o.side === Side.buy).length;
    const sellCount = allOrders.filter(o => o.side === Side.sell).length;

    const handleCancelAll = async () => {
        try {
            await cancelAll.mutateAsync();
        } catch {
            // error handled by mutation state
        }
    };

    return (
        <div className="terminal-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Open Orders</span>
                    {hasData && !isCancelling && !isInitialLoading && (
                        <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-buy/10 text-terminal-buy border border-terminal-buy/30">
                                {buyCount} BUY
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30">
                                {sellCount} SELL
                            </span>
                        </div>
                    )}
                    {isCancelling && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-warning/10 text-terminal-warning border border-terminal-warning/30">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            CANCELLING…
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {(hasData || isCancelling) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelAll}
                            disabled={isCancelling}
                            className="h-6 px-2 text-[10px] font-mono tracking-widest uppercase bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30 hover:bg-terminal-sell/20 disabled:opacity-40"
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    Cancelling…
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancel All
                                </>
                            )}
                        </Button>
                    )}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching || isCancelling}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Refresh open orders"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Cancel All error */}
            {cancelAll.isError && (
                <div className="flex items-center gap-2 text-xs font-mono text-terminal-sell bg-terminal-sell/5 border border-terminal-sell/25 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Failed to cancel orders. Check canister connectivity.</span>
                </div>
            )}

            {/* Cancel All success banner */}
            {justCancelled && (
                <div className="flex items-center gap-2 text-xs font-mono text-terminal-buy bg-terminal-buy/5 border border-terminal-buy/25 rounded px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>All orders cancelled successfully.</span>
                </div>
            )}

            {/* Content */}
            {isInitialLoading ? (
                /* Loading skeletons */
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full bg-muted" />
                    ))}
                </div>
            ) : isError ? (
                /* Error state */
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-terminal-sell">Failed to fetch orders</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-70">
                            {error instanceof Error ? error.message : 'Check canister connectivity'}
                        </span>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="text-xs font-mono text-terminal-buy hover:underline mt-1"
                    >
                        Retry
                    </button>
                </div>
            ) : isCancelling ? (
                /* Show dimmed list while cancellation is in progress */
                <div className="relative">
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/70 rounded">
                        <Loader2 className="w-6 h-6 animate-spin text-terminal-warning" />
                        <span className="text-xs font-mono text-terminal-warning tracking-widest uppercase">
                            Cancelling {allOrders.length} order{allOrders.length !== 1 ? 's' : ''}…
                        </span>
                    </div>
                    <ScrollArea className="flex-1 max-h-[380px] pointer-events-none">
                        <div className="grid grid-cols-[2.5rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                            <span className="text-[10px] font-mono text-muted-foreground">#</span>
                            <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                            <span className="text-[10px] font-mono text-muted-foreground text-right">PRICE (ICP)</span>
                            <span className="text-[10px] font-mono text-muted-foreground text-right">QTY (ckBTC)</span>
                            <span className="text-[10px] font-mono text-muted-foreground text-right">TIME</span>
                        </div>
                        {sortedOrders.map((order, i) => (
                            <OrderRow key={`${order.orderId}-${i}`} entry={order} index={i} dimmed />
                        ))}
                    </ScrollArea>
                </div>
            ) : !hasData ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center flex-1">
                    <Inbox className="w-7 h-7 text-muted-foreground opacity-40" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-muted-foreground">No open orders</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60 max-w-[200px]">
                            Active ckBTC/ICP orders will appear here when the bot places them
                        </span>
                    </div>
                    {isFetching && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground opacity-60">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Checking…</span>
                        </div>
                    )}
                </div>
            ) : (
                /* Orders table */
                <ScrollArea className="flex-1 max-h-[380px]">
                    <div className="grid grid-cols-[2.5rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">#</span>
                        <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">PRICE (ICP)</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">QTY (ckBTC)</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">TIME</span>
                    </div>
                    {sortedOrders.map((order, i) => (
                        <OrderRow key={`${order.orderId}-${i}`} entry={order} index={i} />
                    ))}
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && !isInitialLoading && (
                <div className="flex items-center text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Updated: {lastUpdated}</span>
                    {hasData && (
                        <span className="ml-auto opacity-60">{allOrders.length} orders</span>
                    )}
                </div>
            )}
        </div>
    );
}
