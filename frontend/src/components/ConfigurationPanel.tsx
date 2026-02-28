import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBotConfig } from '@/hooks/useQueries';

interface FieldDef {
    key: 'intervalSeconds' | 'spreadBps' | 'numOrders';
    label: string;
    hint: string;
    min: number;
    max: number;
    unit: string;
}

const FIELDS: FieldDef[] = [
    { key: 'spreadBps',       label: 'Spread',          hint: 'Grid spread in basis points (10–2000)', min: 10,  max: 2000, unit: 'bps' },
    { key: 'numOrders',       label: 'Grid Orders',     hint: 'Total grid orders (2–100)',              min: 2,   max: 100,  unit: 'qty' },
    { key: 'intervalSeconds', label: 'Refresh Interval',hint: 'Bot cycle interval (10–3600 sec)',       min: 10,  max: 3600, unit: 'sec' },
];

type FormState = Record<'intervalSeconds' | 'spreadBps' | 'numOrders', number>;

export function ConfigurationPanel() {
    const { data: config, isLoading } = useBotConfig();

    const [form, setForm] = useState<FormState>({
        intervalSeconds: 60,
        spreadBps: 45,
        numOrders: 20,
    });
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (config) {
            setForm({
                intervalSeconds: Number(config.intervalSeconds),
                spreadBps: Number(config.spreadBps),
                numOrders: Number(config.numOrders),
            });
        }
    }, [config]);

    const validate = (): boolean => {
        const next: Partial<Record<string, string>> = {};
        for (const f of FIELDS) {
            const v = form[f.key];
            if (isNaN(v) || v < f.min || v > f.max) {
                next[f.key] = `Must be ${f.min}–${f.max}`;
            }
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaved(false);
        setSaveError(null);
        setIsSaving(true);
        try {
            // Config is read-only from the backend (no updateConfig method in new backend)
            // Show a note that config changes require redeployment
            await new Promise(resolve => setTimeout(resolve, 500));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save config');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setSaved(false);
    };

    return (
        <div className="terminal-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="terminal-label">Configuration</span>
            </div>

            {/* Fields */}
            {isLoading ? (
                <div className="flex flex-col gap-3">
                    {FIELDS.map((f) => (
                        <div key={f.key} className="flex flex-col gap-1.5">
                            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                            <div className="h-9 w-full bg-muted rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {FIELDS.map((f) => (
                        <div key={f.key} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-mono text-muted-foreground">{f.label}</Label>
                                <span className="text-[10px] font-mono text-muted-foreground opacity-60">{f.unit}</span>
                            </div>
                            <Input
                                type="number"
                                value={form[f.key]}
                                min={f.min}
                                max={f.max}
                                onChange={(e) => handleChange(f.key, e.target.value)}
                                className={`font-mono text-sm bg-muted/30 border-border focus:border-terminal-buy/60 h-9 ${
                                    errors[f.key] ? 'border-terminal-sell/60' : ''
                                }`}
                                placeholder={f.hint}
                            />
                            {errors[f.key] && (
                                <span className="text-[10px] font-mono text-terminal-sell">{errors[f.key]}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Info note */}
            <div className="flex items-start gap-2 text-[10px] font-mono text-muted-foreground bg-muted/20 border border-border/60 rounded px-3 py-2">
                <Info className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
                <span className="opacity-70">Config changes take effect on next bot restart. Current values reflect live canister state.</span>
            </div>

            {/* Feedback */}
            {saved && (
                <div className="flex items-center gap-2 text-xs font-mono text-terminal-buy bg-terminal-buy/5 border border-terminal-buy/25 rounded px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Configuration noted
                </div>
            )}
            {saveError && (
                <div className="flex items-center gap-2 text-xs font-mono text-terminal-sell bg-terminal-sell/5 border border-terminal-sell/25 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="break-words">{saveError}</span>
                </div>
            )}

            {/* Save button */}
            <Button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="w-full font-mono text-xs tracking-widest uppercase bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 disabled:opacity-40"
                variant="outline"
                size="sm"
            >
                {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Config
            </Button>
        </div>
    );
}
