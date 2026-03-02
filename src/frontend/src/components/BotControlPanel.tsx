import { Button } from "@/components/ui/button";
import {
  useBotConfig,
  useBotStatus,
  useStartBot,
  useStopBot,
} from "@/hooks/useQueries";
import {
  Activity,
  AlertCircle,
  Loader2,
  Play,
  RefreshCw,
  Square,
  WifiOff,
  Zap,
} from "lucide-react";

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

  const errorMessage =
    activeError instanceof Error
      ? activeError.message
      : activeError
        ? "An unexpected error occurred. Please try again."
        : null;

  const isNotReachable = errorMessage?.includes("not reachable");

  return (
    <div className="terminal-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="terminal-label">Bot Control</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          ckBTC/ICP
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 py-3 px-4 rounded bg-muted/30 border border-border">
        {statusLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              botRunning
                ? "bg-terminal-buy animate-pulse-buy shadow-buy-glow"
                : "bg-terminal-sell"
            }`}
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className={`text-sm font-mono font-semibold tracking-wide ${
              botRunning ? "text-terminal-buy" : "text-terminal-sell"
            }`}
          >
            {statusLoading ? "LOADING…" : botRunning ? "RUNNING" : "STOPPED"}
          </span>
          <span className="text-xs text-muted-foreground font-mono truncate">
            {botRunning
              ? "Bot active — placing real ICDex orders"
              : "Bot stopped — no orders being placed"}
          </span>
        </div>
        {botRunning && config && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-terminal-buy/70 shrink-0">
            <Zap className="w-3 h-3" />
            {Number(config.intervalSeconds)}s
          </span>
        )}
      </div>

      {/* Config summary — shows loop-active state when bot is running */}
      {config &&
        (botRunning ? (
          <div className="flex flex-col gap-2">
            {/* Loop active banner */}
            <div className="flex items-center gap-2.5 py-2.5 px-3 rounded bg-terminal-buy/10 border border-terminal-buy/30">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-buy opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-buy" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-mono font-semibold text-terminal-buy tracking-wide">
                  Loop active – orders syncing
                </span>
                <span className="text-[10px] font-mono text-terminal-buy/60 truncate">
                  Reconciling grid every {Number(config.intervalSeconds)}s ·{" "}
                  {Number(config.numOrders)} levels · {Number(config.orderSize)}{" "}
                  ICP/order
                </span>
              </div>
              <RefreshCw
                className="w-3 h-3 text-terminal-buy/50 animate-spin ml-auto shrink-0"
                style={{ animationDuration: "3s" }}
              />
            </div>

            {/* Compact config stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
                <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                  Spread
                </span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {Number(config.spreadPips)} pips
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
                  Size
                </span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {Number(config.orderSize)} ICP
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5 py-2 px-3 rounded bg-muted/20 border border-border/60">
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                Spread
              </span>
              <span className="text-sm font-mono font-semibold text-foreground">
                {Number(config.spreadPips)} pips
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
        ))}

      {/* Action error */}
      {errorMessage && (
        <div className="flex items-start gap-2 py-2 px-3 rounded bg-terminal-sell/10 border border-terminal-sell/30">
          {isNotReachable ? (
            <WifiOff className="w-4 h-4 text-terminal-sell shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-terminal-sell shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-mono text-terminal-sell leading-relaxed">
            {errorMessage}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 font-mono text-xs border-terminal-buy/40 text-terminal-buy hover:bg-terminal-buy/10 hover:border-terminal-buy disabled:opacity-40"
          onClick={handleStart}
          disabled={botRunning || isPending || statusLoading}
        >
          {startBot.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Play className="w-3.5 h-3.5 mr-1.5" />
          )}
          Start
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 font-mono text-xs border-terminal-sell/40 text-terminal-sell hover:bg-terminal-sell/10 hover:border-terminal-sell disabled:opacity-40"
          onClick={handleStop}
          disabled={!botRunning || isPending || statusLoading}
        >
          {stopBot.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Square className="w-3.5 h-3.5 mr-1.5" />
          )}
          Stop
        </Button>
      </div>
    </div>
  );
}
