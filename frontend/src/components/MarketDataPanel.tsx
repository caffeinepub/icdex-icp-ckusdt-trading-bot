import { TrendingUp, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { useLastMidPrice, useBotStatus } from '@/hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';

/**
 * ICDex prices are in e8s (10^8 units = 1 token).
 * For ICP/ckUSDT: price represents ckUSDT per ICP, scaled by 10^8.
 * e.g. 1_000_000_000 = 10.00000000 ckUSDT/ICP
 */
function formatMidPrice(price: bigint): string {
    const num = Number(price);
    if (num === 0) return '—';
    // Divide by 10^8 to get human-readable price
    const humanPrice = num / 1e8;
    if (humanPrice >= 1000) {
        return humanPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (humanPrice >= 1) {
        return humanPrice.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return humanPrice.toFixed(8);
}

function formatRelativeTime(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
}

export function MarketDataPanel() {
    const { data: midPrice, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useLastMidPrice();
    const { data: isRunning } = useBotStatus();

    // Tick every second to keep relative time fresh
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const hasData = midPrice !== undefined && midPrice > BigInt(0);

    // Determine staleness: data older than 30s is considered stale
    const isStale = dataUpdatedAt ? Date.now() - dataUpdatedAt > 30_000 : false;

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Market Data
                    </span>
                    {isError && (
                        <span className="flex items-center gap-1 text-xs font-mono text-terminal-sell ml-1">
                            <AlertCircle className="w-3 h-3" />
                            Error
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

            {/* Mid Price Display */}
            <div
                className={`flex flex-col gap-1 py-3 px-4 rounded border transition-colors ${
                    isError
                        ? 'bg-terminal-sell/5 border-terminal-sell/30'
                        : 'bg-muted/40 border-border'
                }`}
            >
                <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
                    Mid Price
                </span>
                {isLoading ? (
                    <Skeleton className="h-8 w-40 bg-muted" />
                ) : isError ? (
                    <div className="flex items-center gap-2 py-1">
                        <AlertCircle className="w-5 h-5 text-terminal-sell opacity-70" />
                        <div className="flex flex-col">
                            <span className="text-sm font-mono text-terminal-sell">Price fetch failed</span>
                            <span className="text-xs font-mono text-muted-foreground opacity-70">
                                Unable to reach ICDex canister
                            </span>
                        </div>
                    </div>
                ) : hasData ? (
                    <div className="flex items-baseline gap-2">
                        <span
                            className={`text-2xl font-mono font-bold tracking-tight transition-colors ${
                                isStale ? 'text-muted-foreground' : 'text-terminal-neutral'
                            }`}
                        >
                            {formatMidPrice(midPrice!)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">ckUSDT</span>
                        {isStale && (
                            <span className="text-xs font-mono text-terminal-sell/70 ml-1">(stale)</span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-mono font-bold text-muted-foreground">—</span>
                        <span className="text-xs font-mono text-muted-foreground">
                            {isRunning ? 'Waiting for first cycle...' : 'Start bot to fetch data'}
                        </span>
                    </div>
                )}
            </div>

            {/* Pair Info */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 px-3 py-2 rounded bg-muted/20 border border-border">
                    <span className="text-xs font-mono text-muted-foreground">Pair</span>
                    <span className="text-sm font-mono font-semibold text-foreground">ICP/ckUSDT</span>
                </div>
                <div className="flex flex-col gap-0.5 px-3 py-2 rounded bg-muted/20 border border-border">
                    <span className="text-xs font-mono text-muted-foreground">Exchange</span>
                    <span className="text-sm font-mono font-semibold text-foreground">ICDex</span>
                </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                <Clock className={`w-3 h-3 ${isStale ? 'text-terminal-sell/60' : ''}`} />
                {dataUpdatedAt ? (
                    <span className={isStale ? 'text-terminal-sell/70' : ''}>
                        Updated {formatRelativeTime(dataUpdatedAt)}
                    </span>
                ) : (
                    <span>Not yet updated</span>
                )}
                <span className="ml-auto opacity-60">auto-refresh 10s</span>
            </div>
        </div>
    );
}
