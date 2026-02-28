import { useState } from 'react';
import { Play, Square, Activity, AlertCircle, Loader2, Wallet, X, TriangleAlert, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useBotStatus,
    useStartBot,
    useStopBot,
    useConfig,
    useLastMidPrice,
    useOrderErrors,
    useOrderPlacementErrors,
} from '@/hooks/useQueries';

function estimateGridRequirements(numOrders: bigint, midPrice: bigint) {
    const half = Number(numOrders) / 2;
    const humanPrice = Number(midPrice) / 1e8;
    if (humanPrice === 0) return { minIcp: 0, minUsdt: 0 };
    return {
        minIcp: (10 / humanPrice) * half,
        minUsdt: 10 * half,
    };
}

function relativeTime(ms: number): string {
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    return new Date(ms).toLocaleTimeString('en-US', { hour12: false });
}

export function BotControlPanel() {
    const { data: isRunning, isLoading: statusLoading } = useBotStatus();
    const { data: config } = useConfig();
    const { data: midPrice } = useLastMidPrice();
    const startBot = useStartBot();
    const stopBot = useStopBot();
    const { errors: orderErrors } = useOrderErrors();
    const { errors: placementErrors } = useOrderPlacementErrors();

    const [actionError, setActionError] = useState<string | null>(null);
    const [dismissedCancels, setDismissedCancels] = useState<Set<string>>(new Set());
    const [dismissedPlacements, setDismissedPlacements] = useState<Set<string>>(new Set());

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
    const numOrders = config?.numOrders ?? BigInt(20);
    const currentMidPrice = midPrice ?? BigInt(0);
    const { minIcp, minUsdt } = estimateGridRequirements(numOrders, currentMidPrice);
    const hasPriceData = currentMidPrice > BigInt(0);

    const visibleCancelErrors = orderErrors
        .filter((e) => !dismissedCancels.has(String(e.orderId)))
        .slice(0, 3);

    const visiblePlacementErrors = placementErrors
        .filter((e) => !dismissedPlacements.has(e.id))
        .slice(0, 3);

    const totalAlerts = visibleCancelErrors.length + visiblePlacementErrors.length;

    return (
        <div className="terminal-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Bot Control</span>
                    {totalAlerts > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-warning/10 text-terminal-warning border border-terminal-warning/30">
                            <TriangleAlert className="w-2.5 h-2.5" />
                            {totalAlerts}
                        </span>
                    )}
                </div>
                <span className="text-xs font-mono text-muted-foreground">ICP/ckUSDT</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 py-3 px-4 rounded bg-muted/30 border border-border">
                {statusLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                    <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isRunning
                                ? 'bg-terminal-buy animate-pulse-buy shadow-buy-glow'
                                : 'bg-terminal-sell'
                        }`}
                    />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                    <span
                        className={`text-sm font-mono font-semibold tracking-wide ${
                            isRunning ? 'text-terminal-buy' : 'text-terminal-sell'
                        }`}
                    >
                        {statusLoading ? 'LOADING…' : isRunning ? 'RUNNING' : 'STOPPED'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                        {isRunning ? 'Grid trading loop active' : 'Bot is idle — no orders being placed'}
                    </span>
                </div>
                {isRunning && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-terminal-buy/70 shrink-0">
                        <Zap className="w-3 h-3" />
                        {config ? `${Number(config.intervalSeconds)}s` : '—'}
                    </span>
                )}
            </div>

            {/* Order placement errors from trading loop */}
            {visiblePlacementErrors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-terminal-sell/80 tracking-widest uppercase">
                            Order Errors
                        </span>
                        <button
                            onClick={() =>
                                setDismissedPlacements(new Set(placementErrors.map((e) => e.id)))
                            }
                            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Dismiss all
                        </button>
                    </div>
                    {visiblePlacementErrors.map((err) => (
                        <div
                            key={err.id}
                            className="flex items-start gap-2 text-xs font-mono bg-terminal-sell/5 border border-terminal-sell/25 rounded px-3 py-2"
                        >
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-terminal-sell" />
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className="text-terminal-sell/90 break-words leading-relaxed">
                                    {err.message}
                                </span>
                                <span className="text-muted-foreground opacity-70">
                                    {relativeTime(err.timestamp)}
                                </span>
                            </div>
                            <button
                                onClick={() =>
                                    setDismissedPlacements((prev) => new Set([...prev, err.id]))
                                }
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Recent cancellation alerts */}
            {visibleCancelErrors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-terminal-warning/80 tracking-widest uppercase">
                            Recent Cancellations
                        </span>
                        <button
                            onClick={() =>
                                setDismissedCancels(new Set(orderErrors.map((e) => String(e.orderId))))
                            }
                            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Dismiss all
                        </button>
                    </div>
                    {visibleCancelErrors.map((err) => (
                        <div
                            key={String(err.orderId)}
                            className="flex items-start gap-2 text-xs font-mono bg-terminal-warning/5 border border-terminal-warning/25 rounded px-3 py-2"
                        >
                            <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-terminal-warning" />
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className="text-terminal-warning/90">
                                    Order #{String(err.orderId)} cancelled{' '}
                                    <span
                                        className={
                                            err.side === 'buy' ? 'text-terminal-buy' : 'text-terminal-sell'
                                        }
                                    >
                                        [{err.side.toUpperCase()}]
                                    </span>
                                </span>
                                <span className="text-muted-foreground opacity-70">
                                    {relativeTime(err.timestamp)}
                                </span>
                            </div>
                            <button
                                onClick={() =>
                                    setDismissedCancels((prev) => new Set([...prev, String(err.orderId)]))
                                }
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Start/Stop action error */}
            {actionError && (
                <div className="flex items-start gap-2 text-xs font-mono bg-terminal-sell/5 border border-terminal-sell/25 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-terminal-sell" />
                    <span className="text-terminal-sell break-words leading-relaxed flex-1">{actionError}</span>
                    <button
                        onClick={() => setActionError(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Grid requirements estimate */}
            {hasPriceData && (
                <div className="flex flex-col gap-2 py-2 px-3 rounded bg-muted/20 border border-border/60">
                    <div className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-muted-foreground" />
                        <span className="terminal-label">Est. Grid Requirements</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">ICP (sell side)</span>
                            <span className="text-sm font-mono font-semibold text-terminal-sell">
                                {minIcp.toFixed(4)} ICP
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">ckUSDT (buy side)</span>
                            <span className="text-sm font-mono font-semibold text-terminal-buy">
                                {minUsdt.toFixed(2)} USDT
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 mt-auto">
                <Button
                    onClick={handleStart}
                    disabled={isPending || !!isRunning || statusLoading}
                    className="flex-1 font-mono text-xs tracking-widest uppercase bg-terminal-buy/15 text-terminal-buy border border-terminal-buy/40 hover:bg-terminal-buy/25 hover:border-terminal-buy/60 disabled:opacity-40"
                    variant="outline"
                    size="sm"
                >
                    {startBot.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Start
                </Button>
                <Button
                    onClick={handleStop}
                    disabled={isPending || !isRunning || statusLoading}
                    className="flex-1 font-mono text-xs tracking-widest uppercase bg-terminal-sell/15 text-terminal-sell border border-terminal-sell/40 hover:bg-terminal-sell/25 hover:border-terminal-sell/60 disabled:opacity-40"
                    variant="outline"
                    size="sm"
                >
                    {stopBot.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                        <Square className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Stop
                </Button>
            </div>
        </div>
    );
}
