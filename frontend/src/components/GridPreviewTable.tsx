import { LayoutGrid, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { useLastGrid, useBotStatus } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

function formatPrice(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '0';
    if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(8);
}

export function GridPreviewTable() {
    const { data: grid, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useLastGrid();
    const { data: isRunning } = useBotStatus();

    const gridLevels = grid ?? [];
    const hasData = gridLevels.length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    // Separate buys and sells, sort sells descending (highest first), buys descending
    const sells = gridLevels
        .filter(([side]) => side === 'sell')
        .sort(([, a], [, b]) => Number(b - a));
    const buys = gridLevels
        .filter(([side]) => side === 'buy')
        .sort(([, a], [, b]) => Number(b - a));

    // Compute mid price from grid
    const lowestSell = sells.length > 0 ? sells[sells.length - 1][1] : null;
    const highestBuy = buys.length > 0 ? buys[0][1] : null;
    const midPrice = lowestSell && highestBuy
        ? (lowestSell + highestBuy) / BigInt(2)
        : null;

    return (
        <div className="terminal-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Grid Levels</span>
                    {hasData && (
                        <div className="flex items-center gap-1.5 ml-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-buy/10 text-terminal-buy border border-terminal-buy/30">
                                {buys.length} BUY
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30">
                                {sells.length} SELL
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh grid levels"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-full bg-muted" />
                    ))}
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-terminal-sell">Failed to load grid</span>
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
                        <span className="text-sm font-mono text-muted-foreground">No grid data yet</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            {isRunning ? 'Waiting for first bot cycle…' : 'Start the bot to generate grid levels'}
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[380px]">
                    {/* Table header */}
                    <div className="grid grid-cols-[3rem_1fr] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">PRICE (ckUSDT)</span>
                    </div>

                    {/* Sell levels — highest to lowest */}
                    {sells.map(([side, price], i) => (
                        <div
                            key={`sell-${i}`}
                            className="grid grid-cols-[3rem_1fr] gap-2 px-3 py-2 border-b border-border/40 hover:bg-terminal-sell/5 transition-colors"
                        >
                            <span className="text-xs font-mono font-semibold self-center text-terminal-sell">
                                SELL
                            </span>
                            <span className="text-xs font-mono text-right self-center text-terminal-sell tabular-nums">
                                {formatPrice(price)}
                            </span>
                        </div>
                    ))}

                    {/* Mid price marker */}
                    {midPrice && midPrice > BigInt(0) && (
                        <div className="flex items-center gap-2 px-3 py-1.5 my-0.5 bg-muted/30 border border-border/60 rounded">
                            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                                Mid
                            </span>
                            <span className="text-xs font-mono font-semibold text-foreground ml-auto">
                                {formatPrice(midPrice)}
                            </span>
                        </div>
                    )}

                    {/* Buy levels — highest to lowest */}
                    {buys.map(([side, price], i) => (
                        <div
                            key={`buy-${i}`}
                            className="grid grid-cols-[3rem_1fr] gap-2 px-3 py-2 border-b border-border/40 hover:bg-terminal-buy/5 transition-colors"
                        >
                            <span className="text-xs font-mono font-semibold self-center text-terminal-buy">
                                BUY
                            </span>
                            <span className="text-xs font-mono text-right self-center text-terminal-buy tabular-nums">
                                {formatPrice(price)}
                            </span>
                        </div>
                    ))}
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && (
                <div className="flex items-center text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Updated: {lastUpdated}</span>
                    {hasData && (
                        <span className="ml-auto opacity-60">{gridLevels.length} levels</span>
                    )}
                </div>
            )}
        </div>
    );
}
