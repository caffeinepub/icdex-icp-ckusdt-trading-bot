import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfig, useSetConfig } from '@/hooks/useQueries';

interface ConfigField {
    key: 'intervalSeconds' | 'spreadBps' | 'numOrders';
    label: string;
    description: string;
    min: number;
    max: number;
    unit: string;
}

const CONFIG_FIELDS: ConfigField[] = [
    {
        key: 'intervalSeconds',
        label: 'Interval',
        description: 'Loop interval in seconds',
        min: 10,
        max: 3600,
        unit: 'sec',
    },
    {
        key: 'spreadBps',
        label: 'Spread',
        description: 'Grid spread in basis points',
        min: 10,
        max: 2000,
        unit: 'bps',
    },
    {
        key: 'numOrders',
        label: 'Orders',
        description: 'Total number of grid orders',
        min: 4,
        max: 50,
        unit: 'qty',
    },
];

export function ConfigurationPanel() {
    const { data: config, isLoading } = useConfig();
    const setConfig = useSetConfig();

    const [form, setForm] = useState({
        intervalSeconds: 60,
        spreadBps: 45,
        numOrders: 20,
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [saveSuccess, setSaveSuccess] = useState(false);

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
        const errors: Record<string, string> = {};
        CONFIG_FIELDS.forEach(({ key, min, max, label }) => {
            const val = form[key];
            if (isNaN(val) || val < min || val > max) {
                errors[key] = `${label} must be between ${min} and ${max}`;
            }
        });
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaveSuccess(false);
        try {
            await setConfig.mutateAsync(form);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch {
            // error handled below
        }
    };

    const handleChange = (key: keyof typeof form, value: string) => {
        const num = parseInt(value, 10);
        setForm((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
        if (validationErrors[key]) {
            setValidationErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    return (
        <div className="terminal-border rounded-lg bg-card p-5 flex flex-col gap-4 shadow-terminal">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                        Configuration
                    </span>
                </div>
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3">
                {CONFIG_FIELDS.map(({ key, label, description, unit }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor={key}
                                className="text-xs font-mono font-medium text-foreground tracking-wide"
                            >
                                {label}
                            </Label>
                            <span className="text-xs font-mono text-muted-foreground">{description}</span>
                        </div>
                        <div className="relative flex items-center">
                            <Input
                                id={key}
                                type="number"
                                value={form[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className={`font-mono text-sm bg-muted/40 border-border focus:border-primary pr-12 ${
                                    validationErrors[key] ? 'border-terminal-sell focus:border-terminal-sell' : ''
                                }`}
                                disabled={isLoading || setConfig.isPending}
                            />
                            <span className="absolute right-3 text-xs font-mono text-muted-foreground pointer-events-none">
                                {unit}
                            </span>
                        </div>
                        {validationErrors[key] && (
                            <span className="text-xs font-mono text-terminal-sell">{validationErrors[key]}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <Button
                onClick={handleSave}
                disabled={setConfig.isPending || isLoading}
                className="w-full gap-2 font-mono text-xs tracking-wider uppercase font-semibold mt-1"
            >
                {setConfig.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveSuccess ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                    <Save className="w-3.5 h-3.5" />
                )}
                {saveSuccess ? 'Saved!' : 'Save Config'}
            </Button>

            {/* Error */}
            {setConfig.isError && (
                <div className="flex items-start gap-2 text-xs text-terminal-sell font-mono bg-terminal-sell/10 border border-terminal-sell/30 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{setConfig.error instanceof Error ? setConfig.error.message : 'Failed to save config'}</span>
                </div>
            )}
        </div>
    );
}
