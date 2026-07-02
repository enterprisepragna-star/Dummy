import React, { useEffect, useState } from "react";
import api, { formatINR } from "@/lib/api";
import { ADMIN } from "@/constants/testIds";
import { toast } from "sonner";
import { Calculator, ArrowRight } from "lucide-react";

export default function PricingRulePage() {
  const [rule, setRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewPrice, setPreviewPrice] = useState(950);

  const load = async () => {
    const { data } = await api.get("/pricing-rule");
    setRule(data);
  };
  useEffect(() => { load(); }, []);

  if (!rule) return <p className="text-sm text-zinc-500">Loading…</p>;

  const update = (k, v) => setRule(r => ({ ...r, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      await api.put("/pricing-rule", {
        threshold: Number(rule.threshold),
        below_increment: Number(rule.below_increment),
        at_or_above_increment: Number(rule.at_or_above_increment),
        rounding: Number(rule.rounding || 1),
        active: rule.active !== false,
      });
      toast.success("Pricing rule saved. Catalog prices updated.");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const next = !(rule.active !== false);
    setRule(r => ({ ...r, active: next }));
    try {
      await api.put("/pricing-rule", {
        threshold: Number(rule.threshold),
        below_increment: Number(rule.below_increment),
        at_or_above_increment: Number(rule.at_or_above_increment),
        rounding: Number(rule.rounding || 1),
        active: next,
      });
      toast.success(next ? "Markup rule enabled" : "Markup rule paused — catalog prices now equal supplier price");
    } catch {
      toast.error("Failed to update");
      setRule(r => ({ ...r, active: !next }));
    }
  };

  const computeOncost = (sg) => {
    if (rule.active === false) return Number(sg);
    const t = Number(rule.threshold);
    return Number(sg) < t ? Number(sg) + Number(rule.below_increment) : Number(sg) + Number(rule.at_or_above_increment);
  };

  return (
    <div className="max-w-4xl">
      <p className="overline">Configuration</p>
      <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Pricing Rules</h1>
      <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
        Define the markup applied to your supplier price to compute your ONCOST selling price.
        Per-item overrides on the Products page take priority over this rule.
      </p>

      {/* Master ON/OFF toggle */}
      <div className={`mt-6 border ${rule.active === false ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"} p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
        <div>
          <p className="overline text-[10px] flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${rule.active === false ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`}></span>
            {rule.active === false ? "Markup rule is OFF" : "Markup rule is ON"}
          </p>
          <p className="text-sm mt-1 font-display">
            {rule.active === false
              ? "Catalog will show supplier price as-is (no markup added)."
              : "Catalog shows supplier price + markup as configured below."}
          </p>
        </div>
        <button
          onClick={toggleActive}
          data-testid="pricing-rule-toggle"
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${rule.active === false ? "bg-zinc-300" : "bg-emerald-600"}`}
          aria-label="Toggle pricing rule"
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${rule.active === false ? "translate-x-1" : "translate-x-9"}`} />
        </button>
      </div>

      <div className={`mt-10 border border-zinc-200 ${rule.active === false ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="border-r border-zinc-200 p-6">
            <p className="overline text-[10px]">Threshold (₹)</p>
            <input
              data-testid={ADMIN.ruleThreshold}
              type="number"
              value={rule.threshold}
              onChange={(e) => update("threshold", e.target.value)}
              className="mt-2 w-full text-3xl font-display font-light border-0 border-b border-zinc-200 focus:border-[#002FA7] outline-none py-2 font-mono"
            />
            <p className="text-xs text-zinc-500 mt-2">Items priced below this use the lower markup.</p>
          </div>
          <div className="border-r border-zinc-200 p-6">
            <p className="overline text-[10px]">Below ₹{rule.threshold} — add</p>
            <input
              data-testid={ADMIN.ruleBelow}
              type="number"
              value={rule.below_increment}
              onChange={(e) => update("below_increment", e.target.value)}
              className="mt-2 w-full text-3xl font-display font-light border-0 border-b border-zinc-200 focus:border-[#002FA7] outline-none py-2 font-mono"
            />
            <p className="text-xs text-zinc-500 mt-2">Default markup for affordable items.</p>
          </div>
          <div className="p-6">
            <p className="overline text-[10px]">At or above ₹{rule.threshold} — add</p>
            <input
              data-testid={ADMIN.ruleAbove}
              type="number"
              value={rule.at_or_above_increment}
              onChange={(e) => update("at_or_above_increment", e.target.value)}
              className="mt-2 w-full text-3xl font-display font-light border-0 border-b border-zinc-200 focus:border-[#002FA7] outline-none py-2 font-mono"
            />
            <p className="text-xs text-zinc-500 mt-2">Higher markup for premium items.</p>
          </div>
        </div>
        <div className="border-t border-zinc-900 px-6 py-4 flex items-center justify-between bg-zinc-50">
          <p className="overline text-[10px]">Live preview</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={previewPrice}
              onChange={(e) => setPreviewPrice(e.target.value)}
              className="w-24 px-2 py-1 border border-zinc-300 text-right font-mono text-sm"
            />
            <ArrowRight size={14} className="text-zinc-400" />
            <span className="font-display text-xl font-medium">{formatINR(computeOncost(previewPrice))}</span>
          </div>
          <button
            data-testid={ADMIN.ruleSave}
            onClick={onSave}
            disabled={saving}
            className="bg-[#002FA7] hover:bg-[#002277] text-white px-5 py-2 text-sm font-medium flex items-center gap-2"
          >
            <Calculator size={14} /> {saving ? "Saving…" : "Save rule"}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
        {[300, 750, 999, 1000, 1500, 2650].map((p) => (
          <div key={p} className="bg-white p-4">
            <p className="overline">SG Cost</p>
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-zinc-500">{formatINR(p)}</span>
              <ArrowRight size={14} className="text-zinc-400" />
              <span className="font-display font-medium text-lg">{formatINR(computeOncost(p))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
