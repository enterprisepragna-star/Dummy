import React, { useEffect, useState } from "react";
import api, { formatINR } from "@/lib/api";
import { toast } from "sonner";
import { Percent, IndianRupee, Save, PowerOff, Power } from "lucide-react";

/**
 * Global persistent discount config.
 * Applied automatically to every new quotation unless overridden per-quote.
 */
export default function DiscountConfigPage() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewAmount, setPreviewAmount] = useState(10000);

  const load = async () => {
    const { data } = await api.get("/discount-config");
    setCfg(data);
  };
  useEffect(() => { load(); }, []);

  if (!cfg) return <p className="text-sm text-zinc-500">Loading…</p>;

  const update = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/discount-config", {
        active: !!cfg.active,
        type: cfg.type || "flat",
        value: Number(cfg.value) || 0,
        label: (cfg.label || "Discount").trim(),
      });
      toast.success("Discount configuration saved");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Save failed";
      toast.error(typeof msg === "string" ? msg : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const compute = (amt) => {
    const v = Number(cfg.value) || 0;
    if (!cfg.active) return 0;
    return cfg.type === "percent" ? (amt * v) / 100 : Math.min(v, amt);
  };

  return (
    <div className="max-w-4xl">
      <p className="overline">Configuration</p>
      <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Discount</h1>
      <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
        Set a <b>persistent discount</b> that automatically applies to every new quotation.
        Can be a flat ₹ amount or a percentage. Individual quotations can still override this if needed.
      </p>

      <div className={`mt-6 border ${cfg.active ? "border-emerald-300 bg-emerald-50" : "border-zinc-300 bg-zinc-50"} p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
        <div>
          <p className="overline text-[10px] flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${cfg.active ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`}></span>
            {cfg.active ? "Discount is ACTIVE" : "Discount is OFF"}
          </p>
          <p className="text-sm mt-1 font-display">
            {cfg.active
              ? `New quotes will get ${cfg.type === "percent" ? cfg.value + "%" : formatINR(cfg.value)} deducted as "${cfg.label}".`
              : "No global discount applied. Turn ON to enable."}
          </p>
        </div>
        <button
          onClick={() => update("active", !cfg.active)}
          data-testid="discount-toggle"
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${cfg.active ? "bg-emerald-600" : "bg-zinc-300"}`}
          aria-label="Toggle discount"
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${cfg.active ? "translate-x-9" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="mt-8 border border-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="border-r border-zinc-200 p-6">
            <p className="overline text-[10px]">Discount Type</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => update("type", "flat")}
                data-testid="discount-type-flat"
                className={`px-3 py-2 border text-xs flex items-center justify-center gap-1.5 ${cfg.type === "flat" ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white border-zinc-300 hover:border-zinc-900"}`}
              >
                <IndianRupee size={12} /> Flat
              </button>
              <button
                onClick={() => update("type", "percent")}
                data-testid="discount-type-percent"
                className={`px-3 py-2 border text-xs flex items-center justify-center gap-1.5 ${cfg.type === "percent" ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white border-zinc-300 hover:border-zinc-900"}`}
              >
                <Percent size={12} /> Percent
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-3">Flat = fixed ₹ deducted. Percent = % of (subtotal + charges).</p>
          </div>
          <div className="border-r border-zinc-200 p-6">
            <p className="overline text-[10px]">Value</p>
            <div className="mt-2 relative">
              <input
                type="number"
                min={0}
                step={cfg.type === "percent" ? 0.5 : 50}
                value={cfg.value}
                onChange={(e) => update("value", e.target.value)}
                data-testid="discount-value"
                className="w-full text-3xl font-display font-light border-0 border-b border-zinc-200 focus:border-[#002FA7] outline-none py-2 font-mono pr-8"
              />
              <span className="absolute right-0 top-3 text-zinc-500">{cfg.type === "percent" ? "%" : "₹"}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">{cfg.type === "percent" ? "Percentage of pre-tax total." : "Fixed rupee amount."}</p>
          </div>
          <div className="p-6">
            <p className="overline text-[10px]">Label (shown on quote/PDF)</p>
            <input
              type="text"
              value={cfg.label}
              onChange={(e) => update("label", e.target.value)}
              data-testid="discount-label"
              className="mt-2 w-full text-lg font-display font-light border-0 border-b border-zinc-200 focus:border-[#002FA7] outline-none py-2"
              placeholder="e.g. Festive Offer"
            />
            <p className="text-xs text-zinc-500 mt-3">This label will appear on the quotation PDF as “Less: {cfg.label || "..."}”.</p>
          </div>
        </div>

        <div className="border-t border-zinc-900 px-6 py-4 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <p className="overline text-[10px]">Live preview</p>
            <input
              type="number"
              value={previewAmount}
              onChange={(e) => setPreviewAmount(e.target.value)}
              className="w-28 px-2 py-1 border border-zinc-300 text-right font-mono text-sm"
            />
            <span className="text-zinc-400">→</span>
            <span className="font-display text-xl font-medium">
              You save {formatINR(compute(Number(previewAmount)))}
            </span>
          </div>
          <button
            onClick={save}
            disabled={saving}
            data-testid="discount-save"
            className="bg-[#002FA7] hover:bg-[#002277] text-white px-5 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save discount"}
          </button>
        </div>
      </div>

      <div className="mt-6 text-xs text-zinc-500 border border-dashed border-zinc-300 p-4 flex items-start gap-2">
        {cfg.active ? <Power size={14} className="mt-0.5 text-emerald-600" /> : <PowerOff size={14} className="mt-0.5 text-zinc-400" />}
        <p>
          <b>How it applies:</b> When enabled, every new quotation automatically gets this discount deducted after
          Subtotal + Packaging + Branding + Shipping, and <b>before</b> GST. On any individual quotation you can still
          override the discount from the Quotation detail page.
        </p>
      </div>
    </div>
  );
}
