import { useState } from 'react';
import { Play, Square, Activity, AlertCircle, Loader2, Wallet, Info, X, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBotStatus, useStartBot, useStopBot, useConfig, useLastMidPrice, useOrderErrors } from '@/hooks/useQueries';

/**
 * Estimate the minimum ICP and ckUSDT needed for the configured grid.
 * Each order is ~$10 worth of ICP. Half orders are buys (need ckUSDT), half are sells (need ICP).
 * Price is in e8s (divide by 1e8 to get human price).
 */
function estimateGridRequirements(
    numOrders: bigint,
    midPrice: bigint
): { minIcp: number; minUsdt: number } {
    const halfOrders = Number(numOrders) / 2;
    const humanPrice = Number(midPrice) / 1e8;
    if (humanPrice === 0) return { minIcp: 0, minUsdt: 0 };
    const icpPerOrder = 10 / humanPrice;
    const minIcp = icpPerOrder * halfOrders;
    const minUsdt = 10 * halfOrders;
    return { minIcp, minUsdt };
}

function formatRelativeTime(timestampMs: number): string {
    const diffMs = Date.now() - timestampMs;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return new Date(timestampMs).toLocaleTimeString('en-US', { hour12: false });
}

export function BotControlPanel() {
    const { data: isRunning, isLoading: statusLoading, error: statusError } = useBotStatus();
    const { data: config } = useConfig();
    const { data: midPrice } = useLastMidPrice();
    const startBot = useStartBot();
    const stopBot = useStopBot();
    const { errors: orderErrors, hasErrors } = useOrderErrors();

    const [actionError, setActionError] = useState<string | null>(null);
    const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

    const handleStart = async () => {
        setActionError(null);
        try {
            await startBot.mutateAsync();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to start bot');
        }
    };

    const handleStop = async () => {
        setActionError(null);
        try {
            await stopBot.mutateAsync();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to stop bot');
        }
    };

    const isPending = startBot.isPending || stopBot.isPending;

    // Compute grid requirements for informational display
    const numOrders = config?.numOrders ?? BigInt(20);
    const currentMidPrice = midPrice ?? BigInt(0);
    const { minIcp, minUsdt } = estimateGridRequirements(numOrders, currentMidPrice);
    const hasPriceData = currentMidPrice > BigInt(0);

    // Filter out dismissed errors and limit to 3 most recent
    const visibleErrors = orderErrors
        .filter((e) => !dismissedErrors.has(String(e.orderId)))
        .slice(0, 3);

    const dismissError = (orderId: bigint) => {
        setDismissedErrors((prev) => new Set([...prev, String(orderId)]));
    };

    const dismissAll = () => {
        setDismissedErrors(new Set(orderErrors.map((e) => String(e.orderId))));
    };

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Bot Control
                    </span>
                    {hasErrors && visibleErrors.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                            <TriangleAlert className="w-2.5 h-2.5" />
                            {visibleErrors.length} WARN
                        </span>
                    )}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                    ICP/ckUSDT
                </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 py-3 px-4 rounded bg-muted/40 border border-border">
                {statusLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                    <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                            isRunning
                                ? 'bg-terminal-buy animate-pulse-buy shadow-buy-glow'
                                : 'bg-terminal-sell'
                        }`}
                    />
                )}
                <div className="flex flex-col">
                    <span
                        className={`text-sm font-mono font-semibold tracking-wide ${
                            isRunning ? 'text-terminal-buy' : 'text-terminal-sell'
                        }`}
                    >
                        {statusLoading ? 'LOADING...' : isRunning ? 'RUNNING' : 'STOPPED'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        {isRunning ? 'Trading loop active — live orders' : 'Bot is idle'}
                    </span>
                </div>
            </div>

            {/* Order Error Alerts */}
            {visibleErrors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-mono text-yellow-400/80 tracking-widest uppercase">
                            Recent Order Events
                        </span>
                        <button
                            onClick={dismissAll}
                            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Dismiss all
                        </button>
                    </div>
                    {visibleErrors.map((err) => (
                        <div
                            key={String(err.orderId)}
                            className="flex items-start gap-2 text-xs font-mono bg-yellow-500/5 border border-yellow-500/25 rounded px-3 py-2"
                        >
                            <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-yellow-400" />
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className="text-yellow-300/90">
                                    Order #{String(err.orderId)} cancelled
                                    {' '}
                                    <span
                                        className={
                                            err.side === 'buy'
                                                ? 'text-terminal-buy'
                                                : 'text-terminal-sell'
                                        }
                                    >
                                        [{err.side.toUpperCase()}]
                                    </span>
                                </span>
                                <span className="text-muted-foreground opacity-70">
                                    {formatRelativeTime(err.timestamp)}
                                </span>
                            </div>
                            <button
                                onClick={() => dismissError(err.orderId)}
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                                title="Dismiss"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Grid Requirements Info */}
            <div className="flex flex-col gap-2 px-3 py-2.5 rounded bg-muted/20 border border-border">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
                        Grid Requirements
                    </span>
                </div>
                {!hasPriceData ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Info className="w-3 h-3 shrink-0" />
                        <span>Start bot once to fetch live price and compute requirements</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-mono text-muted-foreground">Min ICP (sells)</span>
                            <span className="text-sm font-mono font-semibold text-terminal-sell">
                                {minIcp.toFixed(4)} ICP
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-mono text-muted-foreground">Min ckUSDT (buys)</span>
                            <span className="text-sm font-mono font-semibold text-terminal-buy">
                                {minUsdt.toFixed(2)} ckUSDT
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-xs font-mono text-muted-foreground opacity-70">
                                Based on {Number(numOrders)} orders × ~$10/order at current price
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    onClick={handleStart}
                    disabled={isPending || isRunning === true || statusLoading}
                    className="flex-1 gap-2 font-mono text-xs tracking-wider uppercase font-semibold bg-terminal-buy/20 hover:bg-terminal-buy/30 text-terminal-buy border border-terminal-buy/40 hover:border-terminal-buy/70 transition-all"
                    variant="outline"
                >
                    {startBot.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Play className="w-3.5 h-3.5" />
                    )}
                    Start Bot
                </Button>
                <Button
                    onClick={handleStop}
                    disabled={isPending || isRunning === false || statusLoading}
                    className="flex-1 gap-2 font-mono text-xs tracking-wider uppercase font-semibold bg-terminal-sell/20 hover:bg-terminal-sell/30 text-terminal-sell border border-terminal-sell/40 hover:border-terminal-sell/70 transition-all"
                    variant="outline"
                >
                    {stopBot.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Square className="w-3.5 h-3.5" />
                    )}
                    Stop Bot
                </Button>
            </div>

            {/* Action / Status Error Display */}
            {(actionError || statusError) && (
                <div className="flex items-start gap-2 text-xs text-terminal-sell font-mono bg-terminal-sell/10 border border-terminal-sell/30 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{actionError || 'Failed to fetch bot status'}</span>
                    {actionError && (
                        <button
                            onClick={() => setActionError(null)}
                            className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Canister Info */}
            <div className="pt-1 border-t border-border">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>ICDex Canister</span>
                    <span className="text-xs tracking-tight opacity-70">jgxow-pqaaa-aaaar-qahaq-cai</span>
                </div>
            </div>
        </div>
    );
}
