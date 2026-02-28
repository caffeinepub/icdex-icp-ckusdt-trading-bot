import { Heart } from 'lucide-react';
import { BotControlPanel } from './components/BotControlPanel';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { MarketDataPanel } from './components/MarketDataPanel';
import { GridPreviewTable } from './components/GridPreviewTable';
import { OpenOrdersPanel } from './components/OpenOrdersPanel';
import { TradeHistoryPanel } from './components/TradeHistoryPanel';

function Header() {
    return (
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Title */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-terminal-buy font-mono font-bold text-lg tracking-tight">
                                ▶
                            </span>
                            <span className="font-mono font-bold text-sm tracking-widest uppercase text-foreground">
                                ICDex
                            </span>
                            <span className="font-mono font-light text-sm tracking-widest uppercase text-muted-foreground">
                                Grid Bot
                            </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border">
                            <span className="text-xs font-mono text-muted-foreground">ICP</span>
                            <span className="text-xs font-mono text-muted-foreground">/</span>
                            <span className="text-xs font-mono text-muted-foreground">ckUSDT</span>
                        </div>
                    </div>

                    {/* Right side info */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy animate-pulse-buy" />
                            <span>Live Trading</span>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground opacity-60">
                            v1.0.0
                        </div>
                    </div>
                </div>
            </div>
        </header>
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
                    <div className="flex items-center gap-1.5">
                        <span>© {year} ICDex Grid Bot</span>
                        <span className="opacity-40">·</span>
                        <span className="text-terminal-buy/70">Live Trading — ICP/ckUSDT on ICDex</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>Built with</span>
                        <Heart className="w-3 h-3 text-terminal-sell fill-terminal-sell mx-0.5" />
                        <span>using</span>
                        <a
                            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${utmContent}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-terminal-buy hover:text-terminal-buy/80 transition-colors ml-0.5"
                        >
                            caffeine.ai
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function LiveBanner() {
    return (
        <div className="bg-terminal-buy/10 border-b border-terminal-buy/30 px-4 sm:px-6 lg:px-8 py-1.5">
            <div className="max-w-7xl mx-auto flex items-center gap-4 text-xs font-mono">
                <span className="text-terminal-buy font-semibold tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-terminal-buy animate-pulse-buy inline-block" />
                    LIVE TRADING ENABLED
                </span>
                <span className="text-muted-foreground opacity-50">|</span>
                <span className="text-muted-foreground">
                    Real orders will be placed and cancelled on ICDex. Ensure sufficient ICP and ckUSDT balances before starting.
                </span>
                <span className="ml-auto opacity-50 hidden sm:block text-muted-foreground">
                    Canister: jgxow-pqaaa-aaaar-qahaq-cai
                </span>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <LiveBanner />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                {/* Top row: Control + Config + Market Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                    <BotControlPanel />
                    <ConfigurationPanel />
                    <MarketDataPanel />
                </div>

                {/* Middle row: Grid Preview + Open Orders */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                    <GridPreviewTable />
                    <OpenOrdersPanel />
                </div>

                {/* Bottom row: Trade History (full width) */}
                <div className="grid grid-cols-1 gap-4">
                    <TradeHistoryPanel />
                </div>
            </main>

            <Footer />
        </div>
    );
}
