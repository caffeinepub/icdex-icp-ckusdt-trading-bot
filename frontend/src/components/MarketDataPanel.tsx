import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Info } from 'lucide-react';
import { useMarketData, useBotStatus } from '@/hooks/useQueries';

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
    const {
        data: marketData,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useMarketData();
    const { data: isRunning } = useBotStatus();
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const hasData = marketData?.hasData ?? false;
    const midPrice = marketData?.midPrice ?? null;
    const bestBid = marketData?.bestBid ?? null;
    const bestAsk = marketData?.bestAsk ?? null;
    const buyLevels = marketData?.buyLevels ?? 0;
    const sellLevels = marketData?.sellLevels ?? 0;

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
    } else if (isStale && hasData) {
        statusLabel = 'STALE';
        statusClass = 'text-terminal-warning bg-terminal-warning/10 border-terminal-warning/30';
        borderClass = 'border-terminal-warning/20';
    }

    // Derive a human-readable error message
    const errorMessage = isError
        ? (() => {
              const msg = error instanceof Error ? error.message : String(error ?? '');
              if (msg.includes('IC0508') || msg.includes('stopped')) return 'Canister is stopped — restart the bot.';
              if (msg.includes('not reachable') || msg.includes('network')) return 'Network error — check connectivity.';
              if (msg) return msg;
              return 'Failed to fetch market data.';
          })()
        : null;

    return (
        <div className={`terminal-card p-5 flex flex-col gap-4 border ${borderClass} transition-colors duration-500`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Market Data</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${statusClass}`}>
                        {isRunning && !isError && (
                            <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy mr-1 animate-pulse" />
                        )}
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

            {/* Error state */}
            {isError && errorMessage && (
                <div className="flex items-start gap-2 px-3 py-2 rounded bg-terminal-sell/10 border border-terminal-sell/30 text-terminal-sell text-[11px] font-mono">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* No data yet — waiting for first bot cycle */}
            {!isError && !isLoading && !hasData && (
                <div className="flex items-start gap-2 px-3 py-2 rounded bg-muted/20 border border-border/60 text-muted-foreground text-[11px] font-mono">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                        {isRunning
                            ? 'Waiting for first trading cycle to complete…'
                            : 'Start the bot to fetch live market prices from ICDex.'}
                    </span>
                </div>
            )}

            {/* Mid Price */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                    Mid Price (ICP/ckUSDT)
                </span>
                {isLoading ? (
                    <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                ) : (
                    <span className={`text-2xl font-mono font-bold tabular-nums ${hasData ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {hasData && midPrice ? formatPrice(midPrice) : '—'}
                    </span>
                )}
                {dataUpdatedAt && hasData && (
                    <span className="text-[10px] font-mono text-muted-foreground opacity-60">
                        updated {relativeTime(dataUpdatedAt)}
                    </span>
                )}
            </div>

            {/* Bid / Ask */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Best Bid
                    </span>
                    {isLoading ? (
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    ) : (
                        <span className={`text-sm font-mono font-semibold tabular-nums ${bestBid ? 'text-terminal-buy' : 'text-muted-foreground'}`}>
                            {bestBid ? formatPrice(bestBid) : '—'}
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Best Ask
                    </span>
                    {isLoading ? (
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    ) : (
                        <span className={`text-sm font-mono font-semibold tabular-nums ${bestAsk ? 'text-terminal-sell' : 'text-muted-foreground'}`}>
                            {bestAsk ? formatPrice(bestAsk) : '—'}
                        </span>
                    )}
                </div>
            </div>

            {/* Level counts */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Buy Levels
                    </span>
                    {isLoading ? (
                        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                    ) : (
                        <span className={`text-sm font-mono font-semibold ${buyLevels > 0 ? 'text-terminal-buy' : 'text-muted-foreground'}`}>
                            {buyLevels}
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                        Sell Levels
                    </span>
                    {isLoading ? (
                        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                    ) : (
                        <span className={`text-sm font-mono font-semibold ${sellLevels > 0 ? 'text-terminal-sell' : 'text-muted-foreground'}`}>
                            {sellLevels}
                        </span>
                    )}
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
