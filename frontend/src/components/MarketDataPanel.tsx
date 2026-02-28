import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useLastMidPrice } from '@/hooks/useQueries';

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
    const { data: midPrice, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useLastMidPrice();
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const hasPrice = midPrice !== undefined && midPrice > BigInt(0);
    const ageMs = dataUpdatedAt ? now - dataUpdatedAt : null;
    const isStale = ageMs !== null && ageMs > 15_000;

    let statusLabel = 'LIVE';
    let statusClass = 'text-terminal-buy bg-terminal-buy/10 border-terminal-buy/30';
    let borderClass = 'border-terminal-buy/20';

    if (isError) {
        statusLabel = 'ERROR';
        statusClass = 'text-terminal-sell bg-terminal-sell/10 border-terminal-sell/30';
        borderClass = 'border-terminal-sell/20';
    } else if (isStale) {
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
                    title="Refresh"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Price display */}
            <div className="flex flex-col gap-1">
                <span className="terminal-label">ICP / ckUSDT</span>
                {isLoading ? (
                    <div className="h-10 w-40 bg-muted rounded animate-pulse" />
                ) : isError ? (
                    <span className="text-2xl font-mono font-bold text-terminal-sell">—</span>
                ) : (
                    <span className={`text-3xl font-mono font-bold tracking-tight ${hasPrice ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {hasPrice ? formatPrice(midPrice!) : '—'}
                    </span>
                )}
                {hasPrice && !isError && (
                    <span className="text-xs font-mono text-muted-foreground">ckUSDT per ICP</span>
                )}
            </div>

            {/* Info rows */}
            <div className="flex flex-col gap-1.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Mid Price</span>
                    <span className={hasPrice ? 'text-foreground' : 'text-muted-foreground'}>
                        {hasPrice ? formatPrice(midPrice!) : '—'}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Source</span>
                    <span className="text-muted-foreground opacity-70">ICDex level10</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Pair</span>
                    <span className="text-muted-foreground opacity-70">ICP/ckUSDT</span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                <span>
                    {dataUpdatedAt
                        ? `Updated ${relativeTime(dataUpdatedAt)}`
                        : 'Waiting for data…'}
                </span>
                {isFetching && (
                    <span className="text-terminal-buy/70 animate-pulse">Fetching…</span>
                )}
            </div>
        </div>
    );
}
