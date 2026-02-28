import { ListOrdered, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { useOpenOrders } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

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

export function OpenOrdersPanel() {
    const { data: orders, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useOpenOrders();

    const buyOrders = (orders ?? []).filter((o) => o.side === 'buy');
    const sellOrders = (orders ?? []).filter((o) => o.side === 'sell');
    const hasData = (orders ?? []).length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    // Sort: sells high→low, then buys high→low
    const sortedOrders = [
        ...[...sellOrders].sort((a, b) => Number(b.price - a.price)),
        ...[...buyOrders].sort((a, b) => Number(b.price - a.price)),
    ];

    return (
        <div className="terminal-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Open Orders</span>
                    {hasData && (
                        <div className="flex items-center gap-1.5 ml-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-buy/10 text-terminal-buy border border-terminal-buy/30">
                                {buyOrders.length} BUY
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30">
                                {sellOrders.length} SELL
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh open orders"
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
                            Active grid orders will appear here
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[380px]">
                    {/* Table header */}
                    <div className="grid grid-cols-[4.5rem_3rem_1fr_1fr] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">ORDER ID</span>
                        <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">PRICE (ckUSDT)</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">QTY (ICP)</span>
                    </div>

                    {sortedOrders.map((order) => {
                        const isBuy = order.side === 'buy';
                        return (
                            <div
                                key={String(order.orderId)}
                                className={`grid grid-cols-[4.5rem_3rem_1fr_1fr] gap-2 px-3 py-2 border-b border-border/40 transition-colors ${
                                    isBuy ? 'hover:bg-terminal-buy/5' : 'hover:bg-terminal-sell/5'
                                }`}
                            >
                                <span className="text-[10px] font-mono text-muted-foreground self-center truncate">
                                    #{String(order.orderId)}
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
                                    {formatPrice(order.price)}
                                </span>
                                <span className="text-xs font-mono text-right self-center text-foreground/80">
                                    {formatQty(order.quantity)}
                                </span>
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
                        <span className="ml-auto opacity-60">{(orders ?? []).length} orders</span>
                    )}
                </div>
            )}
        </div>
    );
}
