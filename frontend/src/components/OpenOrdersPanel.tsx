import { ListOrdered, RefreshCw, Inbox, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useOpenOrders, useCancelAllOrders } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { OrderEntry } from '@/backend';
import { Side } from '@/backend';

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

function OrderRow({ entry, index }: { entry: OrderEntry; index: number }) {
    const isBuy = entry.side === Side.buy;
    return (
        <div className="grid grid-cols-[2.5rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-2 border-b border-border/40 hover:bg-muted/20 transition-colors">
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
    const { data: orders, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useOpenOrders();
    const cancelAll = useCancelAllOrders();

    const allOrders = orders ?? [];
    const hasData = allOrders.length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    // Sort: sells descending (highest ask first), then buys descending
    const sortedOrders = [...allOrders].sort((a, b) => {
        // Sells first (higher prices), then buys
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
                    {hasData && (
                        <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-buy/10 text-terminal-buy border border-terminal-buy/30">
                                {buyCount} BUY
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30">
                                {sellCount} SELL
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasData && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelAll}
                            disabled={cancelAll.isPending}
                            className="h-6 px-2 text-[10px] font-mono tracking-widest uppercase bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30 hover:bg-terminal-sell/20 disabled:opacity-40"
                        >
                            {cancelAll.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Cancel All
                        </Button>
                    )}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
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
                        <span className="text-sm font-mono text-terminal-sell">Failed to fetch orders</span>
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
                        <span className="text-sm font-mono text-muted-foreground">No open orders</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Active ICDex orders will appear here
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[380px]">
                    {/* Table header */}
                    <div className="grid grid-cols-[2.5rem_3rem_1fr_1fr_3.5rem] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">#</span>
                        <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">PRICE (ckUSDT)</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">QTY (ICP)</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">TIME</span>
                    </div>

                    {sortedOrders.map((order, i) => (
                        <OrderRow key={`${order.orderId}-${i}`} entry={order} index={i} />
                    ))}
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && (
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
