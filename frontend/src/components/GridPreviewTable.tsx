import { LayoutGrid, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { useLastGrid } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

function formatPrice(price: bigint): string {
    const num = Number(price);
    if (num === 0) return '0';
    if (num > 1_000_000) {
        return (num / 1_000_000).toFixed(6);
    }
    return num.toLocaleString();
}

export function GridPreviewTable() {
    const { data: grid, isLoading, isFetching, refetch, dataUpdatedAt } = useLastGrid();

    const buyOrders = grid?.filter(([side]) => side === 'buy') ?? [];
    const sellOrders = grid?.filter(([side]) => side === 'sell') ?? [];

    // Sort: sells descending (highest first), buys descending (closest to mid first)
    const sortedSells = [...sellOrders].sort((a, b) => Number(b[1]) - Number(a[1]));
    const sortedBuys = [...buyOrders].sort((a, b) => Number(b[1]) - Number(a[1]));
    const sortedGrid = [...sortedSells, ...sortedBuys];

    const hasData = grid && grid.length > 0;
    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Grid Preview
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
                    title="Refresh grid"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full bg-muted" />
                    ))}
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <LayoutGrid className="w-8 h-8 text-muted-foreground opacity-40" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-muted-foreground">No grid data yet</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Start the bot and wait for the first trading cycle
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[420px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2rem_5rem_1fr] gap-2 px-3 py-2 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-xs font-mono text-muted-foreground">#</span>
                        <span className="text-xs font-mono text-muted-foreground">SIDE</span>
                        <span className="text-xs font-mono text-muted-foreground text-right">PRICE</span>
                    </div>

                    {/* Table Rows */}
                    <div className="flex flex-col">
                        {sortedGrid.map(([side, price], index) => {
                            const isBuy = side === 'buy';
                            return (
                                <div
                                    key={index}
                                    className={`grid grid-cols-[2rem_5rem_1fr] gap-2 px-3 py-2 border-b border-border/50 transition-colors ${
                                        isBuy
                                            ? 'hover:bg-terminal-buy/5'
                                            : 'hover:bg-terminal-sell/5'
                                    }`}
                                >
                                    {/* Index */}
                                    <span className="text-xs font-mono text-muted-foreground self-center">
                                        {String(index + 1).padStart(2, '0')}
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
                                        {formatPrice(price)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && hasData && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Last cycle: {lastUpdated}</span>
                    <span className="ml-auto opacity-60">{grid?.length ?? 0} orders computed</span>
                </div>
            )}
        </div>
    );
}
