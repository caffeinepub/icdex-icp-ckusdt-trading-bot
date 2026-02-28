import { Heart } from 'lucide-react';
import { BotControlPanel } from './components/BotControlPanel';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { MarketDataPanel } from './components/MarketDataPanel';
import { GridPreviewTable } from './components/GridPreviewTable';
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
                            <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy animate-pulse-buy" />
                            <span>Live</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground opacity-50">v1.0</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

function LiveBanner() {
    return (
        <div className="bg-terminal-buy/8 border-b border-terminal-buy/20 py-1.5 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-terminal-buy font-semibold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy animate-pulse-buy" />
                    LIVE TRADING
                </span>
                <span className="text-muted-foreground opacity-60 hidden sm:block">
                    Real orders will be placed on ICDex. Ensure sufficient ICP and ckUSDT balances.
                </span>
                <span className="ml-auto text-muted-foreground opacity-40 hidden md:block">
                    jgxow-pqaaa-aaaar-qahaq-cai
                </span>
            </div>
        </div>
    );
}

function Footer() {
    const year = new Date().getFullYear();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown-app';
    const utmContent = encodeURIComponent(hostname);

    return (
        <footer className="border-t border-border bg-card/50 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
                    <span>© {year} ICDex Grid Bot — ICP/ckUSDT</span>
                    <div className="flex items-center gap-1">
                        <span>Built with</span>
                        <Heart className="w-3 h-3 text-terminal-sell fill-terminal-sell mx-0.5" />
                        <span>using</span>
                        <a
                            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${utmContent}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-terminal-buy hover:underline ml-0.5"
                        >
                            caffeine.ai
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default function App() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <LiveBanner />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                {/* Row 1: Bot Control + Config + Market Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <BotControlPanel />
                    <ConfigurationPanel />
                    <MarketDataPanel />
                </div>

                {/* Row 2: Grid Preview + Trade History */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <GridPreviewTable />
                    <TradeHistoryPanel />
                </div>

                {/* Row 3: Activity Log (full width) */}
                <div className="grid grid-cols-1 gap-4">
                    <ActivityLogPanel />
                </div>
            </main>

            <Footer />
        </div>
    );
}
