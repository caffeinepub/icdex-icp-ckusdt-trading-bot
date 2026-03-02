import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBotConfig, useUpdateConfig } from "@/hooks/useQueries";
import { CheckCircle2, Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  spreadPips: number;
  numOrders: number;
  intervalSeconds: number;
  orderSize: number; // ICP per level (integer, ≥ 1)
}

// ─── Pip spacing helper ───────────────────────────────────────────────────────

/** Convert pip count to actual price spacing for ICP/ckBTC (1 pip = 0.000001) */
function pipToPrice(pips: number): string {
  return (pips * 0.000001).toFixed(6);
}

export function ConfigurationPanel() {
  const { data: config, isLoading } = useBotConfig();
  const updateConfig = useUpdateConfig();

  const [form, setForm] = useState<FormState>({
    spreadPips: 30,
    numOrders: 8,
    intervalSeconds: 10,
    orderSize: 5,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [saved, setSaved] = useState(false);

  // Sync form with backend config on load
  useEffect(() => {
    if (config) {
      setForm({
        intervalSeconds: Number(config.intervalSeconds),
        spreadPips: Number(config.spreadPips),
        numOrders: Number(config.numOrders),
        orderSize: Number(config.orderSize),
      });
    }
  }, [config]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (
      Number.isNaN(form.spreadPips) ||
      form.spreadPips < 1 ||
      form.spreadPips > 10000
    ) {
      next.spreadPips = "Must be 1–10000 pips";
    }
    if (
      Number.isNaN(form.numOrders) ||
      form.numOrders < 2 ||
      form.numOrders > 50 ||
      form.numOrders % 2 !== 0
    ) {
      next.numOrders = "Must be an even number between 2–50";
    }
    if (
      Number.isNaN(form.intervalSeconds) ||
      form.intervalSeconds < 5 ||
      form.intervalSeconds > 3600
    ) {
      next.intervalSeconds = "Must be 5–3600 seconds";
    }
    if (Number.isNaN(form.orderSize) || form.orderSize <= 0) {
      next.orderSize = "Must be greater than 0 ICP";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaved(false);
    try {
      await updateConfig.mutateAsync({
        spreadPips: form.spreadPips,
        numOrders: form.numOrders,
        intervalSeconds: form.intervalSeconds,
        orderSize: form.orderSize,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // error handled via updateConfig.isError
    }
  };

  const handleNumberChange = (key: keyof FormState, value: string) => {
    const parsed =
      key === "orderSize"
        ? Number.parseFloat(value)
        : Number.parseInt(value, 10);
    setForm((prev) => ({ ...prev, [key]: Number.isNaN(parsed) ? 0 : parsed }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSaved(false);
  };

  const isSaving = updateConfig.isPending;
  const saveError = updateConfig.isError
    ? updateConfig.error instanceof Error
      ? updateConfig.error.message
      : "Failed to save config"
    : null;

  // Derived: grid preview values
  const halfOrders = Math.floor(form.numOrders / 2);
  const pipSpacing = form.spreadPips * 0.000001;
  const exampleMid = 0.0002;

  return (
    <div className="terminal-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <span className="terminal-label">Configuration</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground opacity-60 tracking-widest">
          ICP/ckBTC
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-9 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── Pip Spacing ── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">
                Pip Spacing
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase tracking-widest">
                pips
              </span>
            </div>
            <Input
              type="number"
              value={form.spreadPips}
              min={1}
              max={10000}
              onChange={(e) => handleNumberChange("spreadPips", e.target.value)}
              className={`font-mono text-sm bg-muted/30 border-border focus:border-terminal-buy/60 h-9 ${errors.spreadPips ? "border-terminal-sell/60" : ""}`}
              placeholder="e.g. 30"
            />
            <span className="text-[10px] font-mono text-muted-foreground opacity-50 leading-tight">
              Distance between grid levels. 1 pip = 0.000001 ICP/ckBTC.
              {form.spreadPips > 0 && (
                <>
                  {" "}
                  Current spacing:{" "}
                  <span className="text-foreground/70">
                    {pipToPrice(form.spreadPips)}
                  </span>{" "}
                  ICP/ckBTC per level.
                </>
              )}
            </span>
            {errors.spreadPips && (
              <span className="text-[10px] font-mono text-terminal-sell">
                {errors.spreadPips}
              </span>
            )}
          </div>

          {/* ── Grid Orders ── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">
                Grid Orders
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase tracking-widest">
                orders
              </span>
            </div>
            <Input
              type="number"
              value={form.numOrders}
              min={2}
              max={50}
              step={2}
              onChange={(e) => handleNumberChange("numOrders", e.target.value)}
              className={`font-mono text-sm bg-muted/30 border-border focus:border-terminal-buy/60 h-9 ${errors.numOrders ? "border-terminal-sell/60" : ""}`}
              placeholder="e.g. 8"
            />
            <span className="text-[10px] font-mono text-muted-foreground opacity-50 leading-tight">
              Total orders placed symmetrically. Must be even.
              {form.numOrders >= 2 && form.numOrders % 2 === 0 && (
                <>
                  {" "}
                  {halfOrders} buy + {halfOrders} sell orders.
                </>
              )}
            </span>
            {errors.numOrders && (
              <span className="text-[10px] font-mono text-terminal-sell">
                {errors.numOrders}
              </span>
            )}
          </div>

          {/* ── Refresh Interval ── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">
                Refresh Interval
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase tracking-widest">
                sec
              </span>
            </div>
            <Input
              type="number"
              value={form.intervalSeconds}
              min={5}
              max={3600}
              onChange={(e) =>
                handleNumberChange("intervalSeconds", e.target.value)
              }
              className={`font-mono text-sm bg-muted/30 border-border focus:border-terminal-buy/60 h-9 ${errors.intervalSeconds ? "border-terminal-sell/60" : ""}`}
              placeholder="e.g. 10"
            />
            <span className="text-[10px] font-mono text-muted-foreground opacity-50 leading-tight">
              How often the bot checks and repositions the grid (seconds).
            </span>
            {errors.intervalSeconds && (
              <span className="text-[10px] font-mono text-terminal-sell">
                {errors.intervalSeconds}
              </span>
            )}
          </div>

          {/* ── Order Size (ICP per level) ── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">
                Order Size (ICP per level)
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase tracking-widest">
                ICP
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.orderSize}
                min={1}
                step={1}
                onChange={(e) =>
                  handleNumberChange("orderSize", e.target.value)
                }
                className={`font-mono text-sm bg-muted/30 border-border focus:border-terminal-buy/60 h-9 ${errors.orderSize ? "border-terminal-sell/60" : ""}`}
                placeholder="e.g. 5"
              />
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                ICP
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground opacity-50 leading-tight">
              Fixed ICP quantity placed at each grid level. Must be greater than
              0.
              {form.orderSize > 0 && form.numOrders >= 2 && (
                <>
                  {" "}
                  Total exposure:{" "}
                  <span className="text-foreground/70">
                    {(form.orderSize * form.numOrders).toFixed(0)} ICP
                  </span>{" "}
                  across all {form.numOrders} levels.
                </>
              )}
            </span>
            {errors.orderSize && (
              <span className="text-[10px] font-mono text-terminal-sell">
                {errors.orderSize}
              </span>
            )}
          </div>

          {/* ── Grid Preview ── */}
          <div className="flex flex-col gap-1.5 bg-muted/10 border border-border/50 rounded px-3 py-2.5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
              Grid Preview (example at P = {exampleMid.toFixed(5)})
            </span>
            <div className="flex flex-col gap-0.5">
              {/* Column headers */}
              <div className="grid grid-cols-[5rem_1fr_auto] gap-2 pb-1 border-b border-border/30 mb-0.5">
                <span className="text-[9px] font-mono text-muted-foreground opacity-50 uppercase">
                  Side
                </span>
                <span className="text-[9px] font-mono text-muted-foreground opacity-50 uppercase text-right">
                  Price
                </span>
                <span className="text-[9px] font-mono text-muted-foreground opacity-50 uppercase text-right">
                  Size
                </span>
              </div>
              {Array.from({
                length: halfOrders > 0 ? Math.min(halfOrders, 4) : 0,
              })
                .map((_, i) => {
                  const level = Math.min(halfOrders, 4) - i;
                  const price = exampleMid + level * pipSpacing;
                  return (
                    <div
                      key={`sell-prev-${price.toFixed(8)}-${i}`}
                      className="grid grid-cols-[5rem_1fr_auto] gap-2 text-[10px] font-mono"
                    >
                      <span className="text-terminal-sell">
                        SELL +{level}×pip
                      </span>
                      <span className="text-terminal-sell tabular-nums text-right">
                        {price.toFixed(8)}
                      </span>
                      <span className="text-terminal-sell tabular-nums text-right opacity-80">
                        {form.orderSize > 0 ? form.orderSize : "—"}
                      </span>
                    </div>
                  );
                })
                .reverse()}
              <div className="grid grid-cols-[5rem_1fr_auto] gap-2 text-[10px] font-mono border-t border-b border-border/40 py-0.5 my-0.5">
                <span className="text-muted-foreground">MID</span>
                <span className="text-foreground/80 tabular-nums text-right">
                  {exampleMid.toFixed(8)}
                </span>
                <span className="text-muted-foreground opacity-40 text-right">
                  —
                </span>
              </div>
              {Array.from({
                length: halfOrders > 0 ? Math.min(halfOrders, 4) : 0,
              }).map((_, i) => {
                const level = i + 1;
                const price = exampleMid - level * pipSpacing;
                return (
                  <div
                    key={`buy-prev-${price.toFixed(8)}-${i}`}
                    className="grid grid-cols-[5rem_1fr_auto] gap-2 text-[10px] font-mono"
                  >
                    <span className="text-terminal-buy">BUY −{level}×pip</span>
                    <span className="text-terminal-buy tabular-nums text-right">
                      {price.toFixed(8)}
                    </span>
                    <span className="text-terminal-buy tabular-nums text-right opacity-80">
                      {form.orderSize > 0 ? form.orderSize : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pair info */}
      <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground bg-muted/20 border border-border/60 rounded px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">Pair:</span>
          <span className="text-foreground/80 font-semibold">ICP / ckBTC</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">Price unit:</span>
          <span className="opacity-80">ICP per ckBTC (~0.00020)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">1 pip =</span>
          <span className="opacity-80">0.000001 ICP/ckBTC</span>
        </div>
        {config && (
          <div className="flex items-center gap-1.5 border-t border-border/40 pt-1 mt-0.5">
            <span className="opacity-60">Order size:</span>
            <span className="text-terminal-buy font-semibold">
              {Number(config.orderSize)} ICP
            </span>
            <span className="opacity-50">per level</span>
          </div>
        )}
      </div>

      {/* Save button + feedback */}
      {!isLoading && (
        <div className="flex flex-col gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-9 font-mono text-xs bg-terminal-buy/20 hover:bg-terminal-buy/30 text-terminal-buy border border-terminal-buy/40 hover:border-terminal-buy/60 transition-all"
            variant="outline"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-2" />
                Save Configuration
              </>
            )}
          </Button>

          {/* Success message */}
          {saved && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-terminal-buy bg-terminal-buy/10 border border-terminal-buy/30 rounded px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Configuration saved successfully.</span>
            </div>
          )}

          {/* Error message */}
          {saveError && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-terminal-sell bg-terminal-sell/10 border border-terminal-sell/30 rounded px-3 py-2">
              <span className="shrink-0">✕</span>
              <span>{saveError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
