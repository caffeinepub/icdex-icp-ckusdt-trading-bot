import { Terminal, RefreshCw, Inbox } from 'lucide-react';
import { useActivityLog } from '@/hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_ENTRIES = 50;

interface BadgeConfig {
    label: string;
    className: string;
}

function getEventBadge(eventType: string): BadgeConfig {
    switch (eventType) {
        case 'order_placed':
        case 'order_created':
            return { label: 'ORDER', className: 'bg-terminal-buy/15 text-terminal-buy border-terminal-buy/30' };
        case 'order_cancelled':
            return { label: 'CANCEL', className: 'bg-terminal-sell/15 text-terminal-sell border-terminal-sell/30' };
        case 'order_filled':
            return { label: 'FILLED', className: 'bg-terminal-neutral/15 text-terminal-neutral border-terminal-neutral/30' };
        case 'bot_started':
            return { label: 'START', className: 'bg-terminal-buy/15 text-terminal-buy border-terminal-buy/30' };
        case 'bot_stopped':
            return { label: 'STOP', className: 'bg-terminal-sell/15 text-terminal-sell border-terminal-sell/30' };
        case 'api_error':
            return { label: 'API ERR', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
        case 'connectivity_error':
            return { label: 'CONN ERR', className: 'bg-terminal-sell/15 text-terminal-sell border-terminal-sell/30' };
        case 'error':
            return { label: 'ERROR', className: 'bg-terminal-sell/15 text-terminal-sell border-terminal-sell/30' };
        default:
            return { label: eventType.toUpperCase().slice(0, 8), className: 'bg-muted/40 text-muted-foreground border-border' };
    }
}

function formatTimestamp(nanos: bigint): string {
    const ms = Number(nanos / BigInt(1_000_000));
    return new Date(ms).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isErrorEvent(eventType: string): boolean {
    return eventType === 'error' || eventType === 'api_error' || eventType === 'connectivity_error';
}

export function ActivityLogPanel() {
    const { data: log, isLoading, isFetching, refetch, dataUpdatedAt } = useActivityLog();

    // Reverse-chronological, capped at MAX_ENTRIES
    const entries = log
        ? [...log]
              .sort((a, b) => (b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0))
              .slice(0, MAX_ENTRIES)
        : [];

    const hasData = entries.length > 0;
    const lastUpdated = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
        : null;

    return (
        <div className="terminal-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Activity Log</span>
                    {hasData && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/40 text-muted-foreground border border-border">
                            {entries.length}/{MAX_ENTRIES}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Refresh log"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full bg-muted" />
                    ))}
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <Inbox className="w-7 h-7 text-muted-foreground opacity-40" />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-mono text-muted-foreground">No activity yet</span>
                        <span className="text-xs font-mono text-muted-foreground opacity-60">
                            Bot events will appear here
                        </span>
                    </div>
                </div>
            ) : (
                <ScrollArea className="max-h-64">
                    <div className="flex flex-col gap-0.5">
                        {entries.map((entry, i) => {
                            const badge = getEventBadge(entry.eventType);
                            const isErr = isErrorEvent(entry.eventType);
                            return (
                                <div
                                    key={i}
                                    className={`flex items-start gap-2.5 px-3 py-2 rounded text-xs font-mono transition-colors ${
                                        isErr
                                            ? 'bg-terminal-sell/5 hover:bg-terminal-sell/8'
                                            : 'hover:bg-muted/30'
                                    }`}
                                >
                                    {/* Timestamp */}
                                    <span className="text-muted-foreground opacity-60 shrink-0 tabular-nums">
                                        {formatTimestamp(entry.timestamp)}
                                    </span>

                                    {/* Badge */}
                                    <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badge.className}`}
                                    >
                                        {badge.label}
                                    </span>

                                    {/* Message */}
                                    <span
                                        className={`flex-1 break-words leading-relaxed ${
                                            isErr ? 'text-terminal-sell/90' : 'text-foreground/80'
                                        }`}
                                    >
                                        {entry.message}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Footer */}
            {lastUpdated && (
                <div className="flex items-center text-xs font-mono text-muted-foreground pt-1 border-t border-border">
                    <span>Updated: {lastUpdated}</span>
                    <span className="ml-auto opacity-50">Polls every 15s</span>
                </div>
            )}
        </div>
    );
}
