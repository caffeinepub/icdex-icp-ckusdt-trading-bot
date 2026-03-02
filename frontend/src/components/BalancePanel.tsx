import { Wallet, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useBalances } from '@/hooks/useQueries';

/**
 * Format a bigint e8s value as ICP with 4 decimal places.
 */
function formatIcp(e8s: bigint): string {
    const n = Number(e8s) / 1e8;
    return n.toFixed(4);
}

/**
 * Format a bigint e8s value as ckBTC with 8 decimal places.
 */
function formatCkbtc(e8s: bigint): string {
    const n = Number(e8s) / 1e8;
    return n.toFixed(8);
}

export function BalancePanel() {
    const { data: balances, isLoading, isError, refetch, isFetching } = useBalances();

    const icpIsZero = balances ? balances.icpBalance === BigInt(0) : false;
    const ckbtcIsZero = balances ? balances.ckbtcBalance === BigInt(0) : false;
    const hasWarning = icpIsZero || ckbtcIsZero;

    return (
        <div className="terminal-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Bot Balances</span>
                    {hasWarning && !isLoading && !isError && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-warning/10 text-terminal-warning border border-terminal-warning/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            LOW
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh balances"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex flex-col gap-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                </div>
            )}

            {/* Error state */}
            {isError && !isLoading && (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                    <AlertCircle className="w-6 h-6 text-destructive opacity-70" />
                    <span className="text-xs font-mono text-destructive">Failed to load balances</span>
                    <button
                        onClick={() => refetch()}
                        className="text-xs font-mono text-terminal-buy hover:underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Balance rows */}
            {!isLoading && !isError && balances && (
                <div className="flex flex-col gap-2">
                    {/* ICP Balance */}
                    <div className={`flex items-center justify-between px-3 py-2.5 rounded border ${
                        icpIsZero
                            ? 'bg-terminal-warning/5 border-terminal-warning/30'
                            : 'bg-muted/20 border-border/60'
                    }`}>
                        <div className="flex items-center gap-2">
                            {icpIsZero && (
                                <AlertTriangle className="w-3.5 h-3.5 text-terminal-warning shrink-0" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                    ICP
                                </span>
                                <span className={`text-sm font-mono font-semibold tabular-nums ${
                                    icpIsZero ? 'text-terminal-warning' : 'text-foreground'
                                }`}>
                                    {formatIcp(balances.icpBalance)}
                                </span>
                            </div>
                        </div>
                        {icpIsZero && (
                            <span className="text-[10px] font-mono text-terminal-warning opacity-80">
                                Insufficient
                            </span>
                        )}
                    </div>

                    {/* ckBTC Balance */}
                    <div className={`flex items-center justify-between px-3 py-2.5 rounded border ${
                        ckbtcIsZero
                            ? 'bg-terminal-warning/5 border-terminal-warning/30'
                            : 'bg-muted/20 border-border/60'
                    }`}>
                        <div className="flex items-center gap-2">
                            {ckbtcIsZero && (
                                <AlertTriangle className="w-3.5 h-3.5 text-terminal-warning shrink-0" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                    ckBTC
                                </span>
                                <span className={`text-sm font-mono font-semibold tabular-nums ${
                                    ckbtcIsZero ? 'text-terminal-warning' : 'text-foreground'
                                }`}>
                                    {formatCkbtc(balances.ckbtcBalance)}
                                </span>
                            </div>
                        </div>
                        {ckbtcIsZero && (
                            <span className="text-[10px] font-mono text-terminal-warning opacity-80">
                                Insufficient
                            </span>
                        )}
                    </div>

                    {/* Warning note when any balance is zero */}
                    {hasWarning && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded bg-terminal-warning/5 border border-terminal-warning/20 mt-1">
                            <AlertTriangle className="w-3 h-3 text-terminal-warning shrink-0 mt-0.5" />
                            <span className="text-[10px] font-mono text-terminal-warning leading-relaxed">
                                Bot may fail to place orders. Deposit{' '}
                                {icpIsZero && ckbtcIsZero
                                    ? 'ICP and ckBTC'
                                    : icpIsZero
                                    ? 'ICP'
                                    : 'ckBTC'}{' '}
                                to the canister.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Polling indicator */}
            {!isLoading && !isError && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground opacity-50 pt-1 border-t border-border/30">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
                    <span>Refreshes every 30s</span>
                </div>
            )}
        </div>
    );
}
