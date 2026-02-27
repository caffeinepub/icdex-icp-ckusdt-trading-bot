import { TrendingUp, RefreshCw, Clock } from 'lucide-react';
import { useLastMidPrice, useBotStatus } from '@/hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';

function formatPrice(price: bigint): string {
    const num = Number(price);
    if (num === 0) return '—';
    // ICP prices are typically in e8s (1 ICP = 1e8 units)
    // Display as a decimal with appropriate precision
    if (num > 1_000_000) {
        return (num / 1_000_000).toFixed(6);
    }
    return num.toLocaleString();
}

function formatPriceLabel(price: bigint): string {
    const num = Number(price);
    if (num === 0) return '';
    if (num > 1_000_000) return 'ICP (×10⁻⁶)';
    return 'raw units';
}

export function MarketDataPanel() {
    const { data: midPrice, isLoading, dataUpdatedAt, refetch, isFetching } = useLastMidPrice();
    const { data: isRunning } = useBotStatus();

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    const hasData = midPrice !== undefined && midPrice > BigInt(0);

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Market Data
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

            {/* Mid Price Display */}
            <div className="flex flex-col gap-1 py-3 px-4 rounded bg-muted/40 border border-border">
                <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
                    Mid Price
                </span>
                {isLoading ? (
                    <Skeleton className="h-8 w-40 bg-muted" />
                ) : hasData ? (
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-bold text-terminal-neutral tracking-tight">
                            {formatPrice(midPrice!)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                            {formatPriceLabel(midPrice!)}
                        </span>
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
            {lastUpdated && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <Clock className="w-3 h-3" />
                    <span>Updated {lastUpdated}</span>
                    <span className="ml-auto opacity-60">auto-refresh 10s</span>
                </div>
            )}
        </div>
    );
}
