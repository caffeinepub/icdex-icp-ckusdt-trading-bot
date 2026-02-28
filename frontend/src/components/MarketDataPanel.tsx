import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useLastGrid, useBotStatus } from '@/hooks/useQueries';

function formatPrice(value: bigint): string {
    const n = Number(value) / 1e8;
    if (n === 0) return '—';
    if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(8);
}

function relativeTime(ms: number): string {
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    return `${m}m ago`;
}

export function MarketDataPanel() {
    const { data: grid, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useLastGrid();
    const { data: isRunning } = useBotStatus();
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const gridLevels = grid ?? [];

    // Derive mid price from grid
    const sells = gridLevels.filter(([side]) => side === 'sell').sort(([, a], [, b]) => Number(a - b));
    const buys = gridLevels.filter(([side]) => side === 'buy').sort(([, a], [, b]) => Number(b - a));
    const lowestSell = sells.length > 0 ? sells[0][1] : null;
    const highestBuy = buys.length > 0 ? buys[0][1] : null;
    const midPrice = lowestSell && highestBuy ? (lowestSell + highestBuy) / BigInt(2) : null;
    const hasPrice = midPrice !== null && midPrice > BigInt(0);

    const ageMs = dataUpdatedAt ? now - dataUpdatedAt : null;
    const isStale = ageMs !== null && ageMs > 30_000;

    let statusLabel = isRunning ? 'LIVE' : 'IDLE';
    let statusClass = isRunning
        ? 'text-terminal-buy bg-terminal-buy/10 border-terminal-buy/30'
        : 'text-muted-foreground bg-muted/20 border-border';
    let borderClass = isRunning ? 'border-terminal-buy/20' : 'border-border';

    if (isError) {
        statusLabel = 'ERROR';
        statusClass = 'text-terminal-sell bg-terminal-sell/10 border-terminal-sell/30';
        borderClass = 'border-terminal-sell/20';
    } else if (isStale && hasPrice) {
        statusLabel = 'STALE';
        statusClass = 'text-terminal-warning bg-terminal-warning/10 border-terminal-warning/30';
        borderClass = 'border-terminal-warning/20';
    }

    return (
        <div className={`terminal-card p-5 flex flex-col gap-4 border ${borderClass} transition-colors duration-500`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Market Data</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${statusClass}`}>
                        {statusLabel}
                    </span>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh market data"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Mid Price */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                    Mid Price (ICP/ckUSDT)
                </span>
                {isLoading ? (
                    <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                ) : (
                    <span className={`text-2xl font-mono font-bold tabular-nums ${hasPrice ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {hasPrice && midPrice ? formatPrice(midPrice) : '—'}
                    </span>
                )}
                {dataUpdatedAt && hasPrice && (
                    <span className="text-[10px] font-mono text-muted-foreground opacity-60">
                        {relativeTime(dataUpdatedAt)}
                    </span>
                )}
            </div>

            {/* Grid stats */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Best Bid
                    </span>
                    <span className="text-sm font-mono font-semibold text-terminal-buy tabular-nums">
                        {highestBuy ? formatPrice(highestBuy) : '—'}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Best Ask
                    </span>
                    <span className="text-sm font-mono font-semibold text-terminal-sell tabular-nums">
                        {lowestSell ? formatPrice(lowestSell) : '—'}
                    </span>
                </div>
            </div>

            {/* Grid info */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Buy Levels
                    </span>
                    <span className="text-sm font-mono font-semibold text-foreground">
                        {buys.length}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Sell Levels
                    </span>
                    <span className="text-sm font-mono font-semibold text-foreground">
                        {sells.length}
                    </span>
                </div>
            </div>

            {/* Pair info */}
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border">
                <span>ICP / ckUSDT</span>
                <span className="opacity-60">ICDex · jgxow…cai</span>
            </div>
        </div>
    );
}
