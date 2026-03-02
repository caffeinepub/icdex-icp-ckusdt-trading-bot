import { LayoutGrid, RefreshCw, Inbox, AlertCircle, Loader2 } from 'lucide-react';
import { useLastGrid, useBotStatus, useBotConfig, useOpenOrders } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Format a bigint price value (stored as e8s) as ICP per ckBTC.
 * Always shows 8 decimal places to handle the ICP/ckBTC price range (~0.00020).
 */
function formatPrice(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '0.00000000';
    return n.toFixed(8);
}

/**
 * Build a symmetric grid preview from a mid price and pip spacing.
 * Returns sell levels (above mid) and buy levels (below mid).
 */
function buildSymmetricGrid(
    midPriceBigInt: bigint,
    pipSpacing: number,
    halfOrders: number
): { sells: bigint[]; buys: bigint[] } {
    const mid = Number(midPriceBigInt) / 1e8;
    const spacing = pipSpacing * 0.000001; // 1 pip = 0.000001 ICP/ckBTC

    const sells: bigint[] = [];
    const buys: bigint[] = [];

    for (let i = 1; i <= halfOrders; i++) {
        const sellPrice = mid + i * spacing;
        const buyPrice = mid - i * spacing;
        sells.push(BigInt(Math.round(sellPrice * 1e8)));
        buys.push(BigInt(Math.round(Math.max(0, buyPrice) * 1e8)));
    }

    return { sells, buys };
}

/**
 * Check if an open order exists for a given side and price.
 * Uses a tolerance of ±1 e8s unit to handle rounding differences.
 */
function hasOpenOrderAtLevel(
    openOrders: Array<{ side: string; price: bigint }>,
    side: 'buy' | 'sell',
    price: bigint,
    tolerance = BigInt(2)
): boolean {
    return openOrders.some(
        (o) =>
            o.side === side &&
            (o.price >= price - tolerance) &&
            (o.price <= price + tolerance)
    );
}

export function GridPreviewTable() {
    const {
        data: grid,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
        fetchStatus,
    } = useLastGrid();
    const { data: isRunning } = useBotStatus();
    const { data: config } = useBotConfig();
    const { data: openOrders } = useOpenOrders();

    // isLoading is true only on the very first fetch (no cached data yet)
    const isInitialLoading = isLoading && fetchStatus === 'fetching';

    const gridLevels = grid ?? [];
    const hasBackendData = gridLevels.length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    // Separate buys and sells from backend data
    const backendSells = gridLevels
        .filter(([side]) => side === 'sell')
        .map(([, price]) => price)
        .sort((a, b) => Number(b - a)); // highest first

    const backendBuys = gridLevels
        .filter(([side]) => side === 'buy')
        .map(([, price]) => price)
        .sort((a, b) => Number(b - a)); // highest first

    // Compute mid price from backend grid
    const lowestSell = backendSells.length > 0 ? backendSells[backendSells.length - 1] : null;
    const highestBuy = backendBuys.length > 0 ? backendBuys[0] : null;
    const midPriceFromGrid = lowestSell && highestBuy
        ? (lowestSell + highestBuy) / BigInt(2)
        : null;

    // Config-derived values for symmetric preview
    const pipSpacing = config ? Number(config.spreadPips) : 30;
    const numOrders = config ? Number(config.numOrders) : 8;
    const halfOrders = Math.floor(numOrders / 2);
    const orderSize = config ? Number(config.orderSize) : 1;

    // When we have a mid price from the backend grid, build a symmetric preview
    // using the configured pip spacing (4 buy + 4 sell by default)
    const useSymmetricPreview = midPriceFromGrid !== null && midPriceFromGrid > BigInt(0);
    const { sells: previewSells, buys: previewBuys } = useSymmetricPreview
        ? buildSymmetricGrid(midPriceFromGrid!, pipSpacing, halfOrders)
        : { sells: [], buys: [] };

    // Decide which data to display: symmetric preview (when mid price available) or raw backend data
    const displaySells = useSymmetricPreview ? previewSells : backendSells;
    const displayBuys = useSymmetricPreview ? previewBuys : backendBuys;
    const displayMid = midPriceFromGrid;

    const hasData = hasBackendData || useSymmetricPreview;

    // Normalise open orders for status lookup
    const normalisedOpenOrders: Array<{ side: string; price: bigint }> = (openOrders ?? []).map((o) => ({
        side: typeof o.side === 'object' ? Object.keys(o.side)[0] : String(o.side),
        price: o.price,
    }));

    // Count placed orders for summary
    const placedSells = displaySells.filter((p) => hasOpenOrderAtLevel(normalisedOpenOrders, 'sell', p)).length;
    const placedBuys = displayBuys.filter((p) => hasOpenOrderAtLevel(normalisedOpenOrders, 'buy', p)).length;
    const totalPlaced = placedSells + placedBuys;
    const totalLevels = displaySells.length + displayBuys.length;

    return (
        <div className="terminal-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Grid Levels</span>
                    {hasData && !isInitialLoading && (
                        <div className="flex items-center gap-1.5 ml-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-buy/10 text-terminal-buy border border-terminal-buy/30">
                                {displayBuys.length} BUY
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-sell/10 text-terminal-sell border border-terminal-sell/30">
                                {displaySells.length} SELL
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasData && !isInitialLoading && totalLevels > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                            <span className="text-terminal-buy">{totalPlaced}</span>/{totalLevels} placed
                        </span>
                    )}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Refresh grid levels"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isInitialLoading ? (
                /* Loading skeletons */
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-full bg-muted" />
                    ))}
                </div>
            ) : isError ? (
                /* Error state */
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-terminal-sell">Failed to load grid</span>
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
            ) : !hasData ? (
                /* Empty state — data was fetched successfully but grid is empty */
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <Inbox className="w-7 h-7 text-muted-foreground opacity-40" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-muted-foreground">No grid data yet</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            {isRunning ? 'Waiting for first bot cycle…' : 'Start the bot to generate grid levels'}
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
                /* Grid table */
                <ScrollArea className="flex-1 max-h-[380px]">
                    {/* Table header */}
                    <div className="grid grid-cols-[3rem_1fr_5rem_4rem_2rem] gap-2 px-3 py-1.5 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">SIDE</span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">
                            PRICE <span className="opacity-60">(ICP/ckBTC)</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right">
                            SIZE <span className="opacity-60">(ICP)</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground text-center">
                            STATUS
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground text-right opacity-60">LVL</span>
                    </div>

                    {/* Sell levels — highest to lowest (index 0 = highest) */}
                    {displaySells.map((price, i) => {
                        const level = displaySells.length - i; // highest level number first
                        const isPlaced = hasOpenOrderAtLevel(normalisedOpenOrders, 'sell', price);
                        return (
                            <div
                                key={`sell-${i}`}
                                className="grid grid-cols-[3rem_1fr_5rem_4rem_2rem] gap-2 px-3 py-2 border-b border-border/40 hover:bg-terminal-sell/5 transition-colors"
                            >
                                <span className="text-xs font-mono font-semibold self-center text-terminal-sell">
                                    SELL
                                </span>
                                <span className="text-xs font-mono text-right self-center text-terminal-sell tabular-nums">
                                    {formatPrice(price)}
                                </span>
                                <span className="text-xs font-mono text-right self-center text-terminal-sell tabular-nums opacity-80">
                                    {orderSize}
                                </span>
                                <span className="self-center flex justify-center">
                                    {isPlaced ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-green-500/15 text-green-400 border border-green-500/30 tracking-wide">
                                            PLACED
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 tracking-wide">
                                            MISSING
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground opacity-50 self-center text-right">
                                    +{level}
                                </span>
                            </div>
                        );
                    })}

                    {/* Mid price marker */}
                    {displayMid && displayMid > BigInt(0) && (
                        <div className="flex items-center gap-2 px-3 py-1.5 my-0.5 bg-muted/30 border border-border/60 rounded">
                            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                                Mid
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground opacity-60 ml-1">
                                ICP/ckBTC
                            </span>
                            <span className="text-xs font-mono font-bold text-foreground tabular-nums ml-auto">
                                {formatPrice(displayMid)}
                            </span>
                        </div>
                    )}

                    {/* Buy levels — highest to lowest */}
                    {displayBuys.map((price, i) => {
                        const level = i + 1; // level 1 = closest to mid
                        const isPlaced = hasOpenOrderAtLevel(normalisedOpenOrders, 'buy', price);
                        return (
                            <div
                                key={`buy-${i}`}
                                className="grid grid-cols-[3rem_1fr_5rem_4rem_2rem] gap-2 px-3 py-2 border-b border-border/40 hover:bg-terminal-buy/5 transition-colors"
                            >
                                <span className="text-xs font-mono font-semibold self-center text-terminal-buy">
                                    BUY
                                </span>
                                <span className="text-xs font-mono text-right self-center text-terminal-buy tabular-nums">
                                    {formatPrice(price)}
                                </span>
                                <span className="text-xs font-mono text-right self-center text-terminal-buy tabular-nums opacity-80">
                                    {orderSize}
                                </span>
                                <span className="self-center flex justify-center">
                                    {isPlaced ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-green-500/15 text-green-400 border border-green-500/30 tracking-wide">
                                            PLACED
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 tracking-wide">
                                            MISSING
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground opacity-50 self-center text-right">
                                    −{level}
                                </span>
                            </div>
                        );
                    })}
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && !isInitialLoading && (
                <div className="flex items-center text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Updated: {lastUpdated}</span>
                    {hasData && (
                        <span className="ml-auto opacity-60">
                            {displaySells.length + displayBuys.length} levels · {pipSpacing} pips · {orderSize} ICP/lvl
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
