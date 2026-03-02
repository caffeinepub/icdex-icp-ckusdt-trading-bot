import { Terminal, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityLog } from '@/hooks/useQueries';
import type { LogEntry } from '@/backend';

function formatTimestamp(ns: bigint): string {
    const ms = Number(ns / BigInt(1_000_000));
    const date = new Date(ms);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function eventColor(eventType: string, message: string): string {
    // Check for order error tag in message first (highest priority)
    if (message.includes('[ORDER_ERROR]') || eventType.includes('order_error')) {
        return 'text-destructive';
    }
    // Check for failure/error event types
    if (
        eventType === 'buy_order_creation_failed' ||
        eventType === 'sell_order_creation_failed' ||
        eventType === 'cancel_orders_error' ||
        eventType === 'cancel_order_error' ||
        eventType === 'error'
    ) {
        return 'text-destructive';
    }
    if (eventType === 'order_placed' || eventType === 'buy_order_created' || eventType === 'sell_order_created') {
        return 'text-terminal-buy';
    }
    if (eventType === 'order_cancelled') return 'text-terminal-sell';
    if (eventType === 'bot_started') return 'text-terminal-warning';
    if (eventType === 'bot_stopped') return 'text-muted-foreground';
    return 'text-foreground';
}

function LogRow({ entry }: { entry: LogEntry }) {
    const isOrderError =
        entry.message.includes('[ORDER_ERROR]') ||
        entry.eventType.includes('order_error') ||
        entry.eventType === 'buy_order_creation_failed' ||
        entry.eventType === 'sell_order_creation_failed';

    return (
        <div className={`flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0 ${isOrderError ? 'bg-destructive/5' : ''}`}>
            <span className="shrink-0 text-xs font-mono text-muted-foreground tabular-nums pt-px">
                {formatTimestamp(entry.timestamp)}
            </span>
            <div className="flex items-start gap-1.5 min-w-0">
                {isOrderError && (
                    <span className="shrink-0 text-[9px] font-mono font-bold text-destructive bg-destructive/10 border border-destructive/30 rounded px-1 py-0.5 mt-px leading-none">
                        ERR
                    </span>
                )}
                <span className={`text-xs font-mono leading-relaxed break-all ${eventColor(entry.eventType, entry.message)}`}>
                    {entry.message}
                </span>
            </div>
        </div>
    );
}

export function ActivityLogPanel() {
    const { data: entries, isLoading, isError } = useActivityLog(50, 0);

    return (
        <div className="terminal-card p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    <span className="terminal-label">Activity Log</span>
                </div>
                {!isLoading && !isError && entries && entries.length > 0 && (
                    <span className="text-xs font-mono text-muted-foreground opacity-60">
                        {entries.length} entries
                    </span>
                )}
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Skeleton className="h-3 w-16 shrink-0 mt-0.5" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ))}
                </div>
            )}

            {/* Error state */}
            {isError && !isLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <AlertCircle className="w-6 h-6 text-destructive opacity-70" />
                    <span className="text-xs font-mono text-destructive">Failed to load activity log</span>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && (!entries || entries.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <Terminal className="w-7 h-7 text-muted-foreground opacity-30" />
                    <span className="text-sm font-mono text-muted-foreground">No activity yet</span>
                    <span className="text-xs font-mono text-muted-foreground opacity-60 max-w-[200px]">
                        Log entries will appear here once the bot starts running
                    </span>
                </div>
            )}

            {/* Log entries */}
            {!isLoading && !isError && entries && entries.length > 0 && (
                <ScrollArea className="flex-1 min-h-0 max-h-64">
                    <div className="flex flex-col pr-2">
                        {entries.map((entry, i) => (
                            <LogRow key={i} entry={entry} />
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
