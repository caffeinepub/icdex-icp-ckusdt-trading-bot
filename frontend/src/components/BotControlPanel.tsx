import { useState } from 'react';
import { Play, Square, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBotStatus, useStartBot, useStopBot } from '@/hooks/useQueries';

export function BotControlPanel() {
    const { data: isRunning, isLoading: statusLoading, error: statusError } = useBotStatus();
    const startBot = useStartBot();
    const stopBot = useStopBot();
    const [actionError, setActionError] = useState<string | null>(null);

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

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Bot Control
                    </span>
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
                        {isRunning ? 'Trading loop active' : 'Bot is idle'}
                    </span>
                </div>
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

            {/* Error Display */}
            {(actionError || statusError) && (
                <div className="flex items-start gap-2 text-xs text-terminal-sell font-mono bg-terminal-sell/10 border border-terminal-sell/30 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{actionError || 'Failed to fetch bot status'}</span>
                </div>
            )}

            {/* Canister Info */}
            <div className="pt-1 border-t border-border">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>Canister</span>
                    <span className="text-xs tracking-tight opacity-70">jgxow-pqaaa-aaaar-qahaq-cai</span>
                </div>
            </div>
        </div>
    );
}
