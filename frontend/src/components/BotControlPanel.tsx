import {
    Play,
    Square,
    Activity,
    AlertCircle,
    Loader2,
    Zap,
    WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useBotStatus,
    useBotConfig,
    useStartBot,
    useStopBot,
} from '@/hooks/useQueries';

export function BotControlPanel() {
    const { data: isRunning, isLoading: statusLoading } = useBotStatus();
    const { data: config } = useBotConfig();
    const startBot = useStartBot();
    const stopBot = useStopBot();

    const handleStart = async () => {
        startBot.reset();
        await startBot.mutateAsync().catch(() => {
            // error is captured in startBot.error
        });
    };

    const handleStop = async () => {
        stopBot.reset();
        await stopBot.mutateAsync().catch(() => {
            // error is captured in stopBot.error
        });
    };

    const isPending = startBot.isPending || stopBot.isPending;
    const botRunning = isRunning ?? false;

    // Determine which error to show (most recent action)
    const activeError = startBot.isError
        ? startBot.error
        : stopBot.isError
        ? stopBot.error
        : null;

    const errorMessage = activeError instanceof Error
        ? activeError.message
        : activeError
        ? 'An unexpected error occurred. Please try again.'
        : null;

    const isNotReachable = errorMessage?.includes('not reachable');

    return (
        <div className="terminal-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Bot Control</span>
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
                            botRunning
                                ? 'bg-terminal-buy animate-pulse-buy shadow-buy-glow'
                                : 'bg-terminal-sell'
                        }`}
                    />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                    <span
                        className={`text-sm font-mono font-semibold tracking-wide ${
                            botRunning ? 'text-terminal-buy' : 'text-terminal-sell'
                        }`}
                    >
                        {statusLoading ? 'LOADING…' : botRunning ? 'RUNNING' : 'STOPPED'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                        {botRunning
                            ? 'Bot active — placing real ICDex orders'
                            : 'Bot stopped — no orders being placed'}
                    </span>
                </div>
                {botRunning && config && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-terminal-buy/70 shrink-0">
                        <Zap className="w-3 h-3" />
                        {Number(config.intervalSeconds)}s
                    </span>
                )}
            </div>

            {/* Config summary */}
            {config && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                            Spread
                        </span>
                        <span className="text-sm font-mono font-semibold text-foreground">
                            {Number(config.spreadBps)} bps
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                            Orders
                        </span>
                        <span className="text-sm font-mono font-semibold text-foreground">
                            {Number(config.numOrders)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                            Interval
                        </span>
                        <span className="text-sm font-mono font-semibold text-foreground">
                            {Number(config.intervalSeconds)}s
                        </span>
                    </div>
                </div>
            )}

            {/* Action error */}
            {errorMessage && (
                <div className="flex items-start gap-2 text-xs font-mono text-terminal-sell bg-terminal-sell/5 border border-terminal-sell/25 rounded px-3 py-2">
                    {isNotReachable ? (
                        <WifiOff className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <span className="break-words">{errorMessage}</span>
                </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-2">
                {!botRunning ? (
                    <Button
                        onClick={handleStart}
                        disabled={isPending || statusLoading}
                        className="w-full font-mono text-xs tracking-widest uppercase bg-terminal-buy/15 text-terminal-buy border border-terminal-buy/40 hover:bg-terminal-buy/25 disabled:opacity-40"
                        variant="outline"
                        size="sm"
                    >
                        {startBot.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Start Bot
                    </Button>
                ) : (
                    <Button
                        onClick={handleStop}
                        disabled={isPending || statusLoading}
                        className="w-full font-mono text-xs tracking-widest uppercase bg-terminal-sell/15 text-terminal-sell border border-terminal-sell/40 hover:bg-terminal-sell/25 disabled:opacity-40"
                        variant="outline"
                        size="sm"
                    >
                        {stopBot.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <Square className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Stop Bot
                    </Button>
                )}
            </div>

            {/* ICDex info */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground opacity-60 pt-1 border-t border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy/60" />
                <span>Orders placed on ICDex canister jgxow…cai</span>
            </div>
        </div>
    );
}
