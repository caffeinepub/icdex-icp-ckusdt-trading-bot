import { Heart } from 'lucide-react';
import { BotControlPanel } from './components/BotControlPanel';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { MarketDataPanel } from './components/MarketDataPanel';
import { GridPreviewTable } from './components/GridPreviewTable';
import { OpenOrdersPanel } from './components/OpenOrdersPanel';
import { TradeHistoryPanel } from './components/TradeHistoryPanel';
import { ActivityLogPanel } from './components/ActivityLogPanel';

function Header() {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-terminal-buy font-mono font-bold text-base">▶</span>
                            <span className="font-mono font-bold text-sm tracking-widest uppercase text-foreground">
                                ICDex
                            </span>
                            <span className="font-mono font-light text-sm tracking-widest uppercase text-muted-foreground">
                                Grid Bot
                            </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/30">
                            <span className="text-xs font-mono text-terminal-buy">ICP</span>
                            <span className="text-xs font-mono text-muted-foreground">/</span>
                            <span className="text-xs font-mono text-muted-foreground">ckUSDT</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy animate-pulse" />
                            <span>LIVE TRADING</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/20">
                            <span className="text-[10px] font-mono text-muted-foreground">canister</span>
                            <span className="text-[10px] font-mono text-terminal-buy/70">jgxow…cai</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

function Footer() {
    const appId = typeof window !== 'undefined' ? window.location.hostname : 'icdex-grid-bot';
    const utmUrl = `https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(appId)}`;

    return (
        <footer className="border-t border-border bg-card/50 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
                    <span>© {new Date().getFullYear()} ICDex Grid Bot — ICP/ckUSDT</span>
                    <span className="flex items-center gap-1">
                        Built with{' '}
                        <Heart className="w-3 h-3 text-terminal-sell fill-terminal-sell mx-0.5" />
                        {' '}using{' '}
                        <a
                            href={utmUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-terminal-buy hover:underline"
                        >
                            caffeine.ai
                        </a>
                    </span>
                </div>
            </div>
        </footer>
    );
}

export default function App() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Header />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                {/* Row 1: Control + Config + Market */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <BotControlPanel />
                    <ConfigurationPanel />
                    <MarketDataPanel />
                </div>

                {/* Row 2: Order Book + Open Orders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <GridPreviewTable />
                    <OpenOrdersPanel />
                </div>

                {/* Row 3: Trade History + Activity Log */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TradeHistoryPanel />
                    <ActivityLogPanel />
                </div>
            </main>

            <Footer />
        </div>
    );
}
