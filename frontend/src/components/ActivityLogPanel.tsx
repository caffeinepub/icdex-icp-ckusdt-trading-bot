import { ScrollText, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { useActivityLog } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

function formatTimestamp(nanos: bigint): string {
    const ms = Number(nanos / BigInt(1_000_000));
    const date = new Date(ms);
    const now = Date.now();
    const diffSec = Math.floor((now - ms) / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

type EventType = 'trade' | 'order_placed' | 'order_cancelled' | 'error' | 'bot_started' | 'bot_stopped' | string;

function EventBadge({ eventType }: { eventType: EventType }) {
    switch (eventType) {
        case 'trade':
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-terminal-buy border-terminal-buy/40 bg-terminal-buy/10"
                >
                    TRADE
                </Badge>
            );
        case 'order_placed':
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-terminal-buy border-terminal-buy/30 bg-terminal-buy/5"
                >
                    PLACED
                </Badge>
            );
        case 'order_cancelled':
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
                >
                    CANCEL
                </Badge>
            );
        case 'error':
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-terminal-sell border-terminal-sell/40 bg-terminal-sell/10"
                >
                    ERROR
                </Badge>
            );
        case 'bot_started':
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-terminal-running border-terminal-running/40 bg-terminal-running/10"
                >
                    START
                </Badge>
            );
        case 'bot_stopped':
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-terminal-stopped border-terminal-stopped/40 bg-terminal-stopped/10"
                >
                    STOP
                </Badge>
            );
        default:
            return (
                <Badge
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0 h-5 shrink-0 text-muted-foreground border-border"
                >
                    {eventType.toUpperCase().slice(0, 6)}
                </Badge>
            );
    }
}

function messageColor(eventType: EventType): string {
    if (eventType === 'error') return 'text-terminal-sell';
    if (eventType === 'order_cancelled') return 'text-yellow-400/80';
    if (eventType === 'bot_started' || eventType === 'bot_stopped') return 'text-foreground/70';
    return 'text-foreground/60';
}

export function ActivityLogPanel() {
    const { data: log, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useActivityLog();

    // Sort most recent first
    const sorted = log
        ? [...log].sort((a, b) => {
              if (b.timestamp > a.timestamp) return 1;
              if (b.timestamp < a.timestamp) return -1;
              return 0;
          })
        : [];

    const errorCount = sorted.filter((e) => e.eventType === 'error').length;
    const hasData = sorted.length > 0;

    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Activity Log
                    </span>
                    {errorCount > 0 && (
                        <Badge
                            variant="outline"
                            className="text-xs font-mono px-1.5 py-0 h-5 ml-1 text-terminal-sell border-terminal-sell/40 bg-terminal-sell/10"
                        >
                            {errorCount} ERR
                        </Badge>
                    )}
                    {hasData && errorCount === 0 && (
                        <Badge
                            variant="outline"
                            className="text-xs font-mono px-1.5 py-0 h-5 ml-1 text-muted-foreground border-border"
                        >
                            {sorted.length}
                        </Badge>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh activity log"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-7 w-full bg-muted" />
                    ))}
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <AlertCircle className="w-7 h-7 text-terminal-sell opacity-60" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-terminal-sell">Failed to fetch log</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Check canister connectivity and try again
                        </span>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="text-xs font-mono text-terminal-buy hover:text-terminal-buy/80 transition-colors mt-1"
                    >
                        Retry
                    </button>
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <Inbox className="w-7 h-7 text-muted-foreground opacity-40" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-muted-foreground">No activity yet</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Bot events, orders, and errors will appear here
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1 max-h-[320px]">
                    <div className="flex flex-col gap-0.5">
                        {sorted.map((entry, idx) => (
                            <div
                                key={idx}
                                className={`flex items-start gap-2.5 px-3 py-2 rounded border-b border-border/30 transition-colors ${
                                    entry.eventType === 'error'
                                        ? 'bg-terminal-sell/5 hover:bg-terminal-sell/10'
                                        : entry.eventType === 'order_cancelled'
                                        ? 'hover:bg-yellow-400/5'
                                        : 'hover:bg-muted/30'
                                }`}
                            >
                                {/* Timestamp */}
                                <span className="text-xs font-mono text-muted-foreground shrink-0 w-16 pt-0.5">
                                    {formatTimestamp(entry.timestamp)}
                                </span>

                                {/* Event type badge */}
                                <div className="pt-0.5">
                                    <EventBadge eventType={entry.eventType} />
                                </div>

                                {/* Message */}
                                <span
                                    className={`text-xs font-mono leading-relaxed break-all ${messageColor(entry.eventType)}`}
                                >
                                    {entry.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}

            {/* Footer */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                {lastUpdated ? (
                    <span>Updated: {lastUpdated}</span>
                ) : (
                    <span>Not yet updated</span>
                )}
                <span className="ml-auto opacity-60">Polls every 10s</span>
            </div>
        </div>
    );
}
