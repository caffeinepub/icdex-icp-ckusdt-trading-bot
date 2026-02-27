import { ListOrdered, RefreshCw, ArrowUp, ArrowDown, AlertCircle, Inbox } from 'lucide-react';
import { useOpenOrders } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Side } from '@/backend';

function formatValue(value: bigint): string {
    const num = Number(value);
    if (num === 0) return '0';
    if (num > 1_000_000) {
        return (num / 1_000_000).toFixed(6);
    }
    return num.toLocaleString();
}

export function OpenOrdersPanel() {
    const { data: orders, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useOpenOrders();

    const buyOrders = orders?.filter((o) => o.side === Side.buy) ?? [];
    const sellOrders = orders?.filter((o) => o.side === Side.sell) ?? [];
    const hasData = orders && orders.length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Open Orders
                    </span>
                    {hasData && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <Badge
                                variant="outline"
                                className="text-xs font-mono px-1.5 py-0 h-5 text-terminal-buy border-terminal-buy/40 bg-terminal-buy/10"
                            >
                                {buyOrders.length} BUY
                            </Badge>
                            <Badge
                                variant="outline"
                                className="text-xs font-mono px-1.5 py-0 h-5 text-terminal-sell border-terminal-sell/40 bg-terminal-sell/10"
                            >
                                {sellOrders.length} SELL
                            </Badge>
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
                        <span className="text-sm font-mono text-muted-foreground">No open orders</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            No active orders found on ICDex
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[420px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[3rem_5rem_1fr_1fr] gap-2 px-3 py-2 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-xs font-mono text-muted-foreground">ID</span>
                        <span className="text-xs font-mono text-muted-foreground">SIDE</span>
                        <span className="text-xs font-mono text-muted-foreground text-right">PRICE</span>
                        <span className="text-xs font-mono text-muted-foreground text-right">QTY</span>
                    </div>

                    {/* Table Rows */}
                    <div className="flex flex-col">
                        {orders.map((order) => {
                            const isBuy = order.side === Side.buy;
                            return (
                                <div
                                    key={String(order.orderId)}
                                    className={`grid grid-cols-[3rem_5rem_1fr_1fr] gap-2 px-3 py-2 border-b border-border/50 transition-colors ${
                                        isBuy
                                            ? 'hover:bg-terminal-buy/5'
                                            : 'hover:bg-terminal-sell/5'
                                    }`}
                                >
                                    {/* Order ID */}
                                    <span className="text-xs font-mono text-muted-foreground self-center truncate">
                                        {String(order.orderId)}
                                    </span>

                                    {/* Side Badge */}
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
                                        {formatValue(order.price)}
                                    </span>

                                    {/* Quantity */}
                                    <span className="text-sm font-mono text-right self-center text-foreground/80">
                                        {formatValue(order.quantity)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Updated: {lastUpdated}</span>
                    {hasData && (
                        <span className="ml-auto opacity-60">{orders?.length ?? 0} total orders</span>
                    )}
                </div>
            )}
        </div>
    );
}
