import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Save, Layers, ArrowUp, ArrowDown, Power, PowerOff } from "lucide-react";

const ROLES = [
  { v: "", l: "Any role" },
  { v: "sales_partner", l: "Sales Partner" },
  { v: "sales_executive", l: "Sales Executive" },
  { v: "sales_manager", l: "Sales Manager" },
  { v: "procurement_partner", l: "Procurement Partner" },
  { v: "franchise_partner", l: "Franchise Partner" },
];

export default function CommissionRulesPage() {
  const [rules, setRules] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=none, {} = new, {id, ...} = edit
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: r }, { data: c }] = await Promise.all([
        api.get("/commission-rules"),
        api.get("/categories"),
      ]);
      setRules(r); setCats(c);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const newRule = () => setEditing({
    name: "", applies_to_role: "", applies_to_category_id: "",
    min_order_value: 0, max_order_value: "", commission_percent: 5, priority: 10, active: true,
  });

  const submit = async () => {
    if (!editing.name?.trim()) { toast.error("Name required"); return; }
    const body = {
      name: editing.name.trim(),
      applies_to_role: editing.applies_to_role || null,
      applies_to_category_id: editing.applies_to_category_id || null,
      min_order_value: Number(editing.min_order_value) || 0,
      max_order_value: editing.max_order_value === "" || editing.max_order_value === null ? null : Number(editing.max_order_value),
      commission_percent: Number(editing.commission_percent) || 0,
      priority: Number(editing.priority) || 0,
      active: editing.active !== false,
    };
    setSaving(true);
    try {
      if (editing.id) await api.put(`/commission-rules/${editing.id}`, body);
      else await api.post("/commission-rules", body);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this rule? Existing commissions already generated are not affected.")) return;
    try {
      await api.delete(`/commission-rules/${id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const toggle = async (r) => {
    try {
      await api.put(`/commission-rules/${r.id}`, { active: !r.active });
      load();
    } catch { toast.error("Toggle failed"); }
  };

  const bumpPriority = async (r, delta) => {
    try {
      await api.put(`/commission-rules/${r.id}`, { priority: Math.max(0, (r.priority || 0) + delta) });
      load();
    } catch { toast.error("Priority update failed"); }
  };

  const catName = (id) => cats.find(c => c.id === id)?.name || "—";

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <p className="overline">OPMS · Commission</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Commission Rules</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Define % commissions by role, product category, order value or per-partner overrides. When a quotation is accepted with a partner attribution, the highest-priority matching active rule is applied automatically.</p>
        </div>
        <button onClick={newRule} data-testid="new-rule-btn" className="text-xs px-3 py-1.5 bg-[#002FA7] hover:bg-[#002277] text-white flex items-center gap-1.5 self-start">
          <Plus size={12} /> + New Rule
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p>
      : rules.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-12 text-center bg-white">
          <Layers size={28} className="mx-auto text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600">No commission rules yet. Add one to enable auto-calculation on partner-attributed sales.</p>
          <button onClick={newRule} className="mt-4 text-xs px-3 py-1.5 bg-[#002FA7] text-white">Create first rule</button>
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="p-3">Priority</th>
                <th className="p-3">Rule</th>
                <th className="p-3">Role</th>
                <th className="p-3">Category</th>
                <th className="p-3">Order range</th>
                <th className="p-3 text-right">%</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} data-testid={`rule-row-${r.id}`} className={`border-b border-zinc-100 hover:bg-zinc-50 ${r.active ? "" : "opacity-50"}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs w-6">{r.priority}</span>
                      <button onClick={() => bumpPriority(r, +1)} className="text-zinc-400 hover:text-zinc-900"><ArrowUp size={11} /></button>
                      <button onClick={() => bumpPriority(r, -1)} className="text-zinc-400 hover:text-zinc-900"><ArrowDown size={11} /></button>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-zinc-600 text-[12px]">{ROLES.find(o => o.v === (r.applies_to_role || ""))?.l || "Any"}</td>
                  <td className="p-3 text-zinc-600 text-[12px]">{r.applies_to_category_id ? catName(r.applies_to_category_id) : "Any"}</td>
                  <td className="p-3 text-zinc-600 text-[12px] font-mono">
                    ₹ {(r.min_order_value || 0).toLocaleString("en-IN")}
                    {r.max_order_value ? ` – ₹ ${Number(r.max_order_value).toLocaleString("en-IN")}` : " +"}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">{r.commission_percent}%</td>
                  <td className="p-3">
                    <button onClick={() => toggle(r)} className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${r.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-500 border-zinc-300"}`}>
                      {r.active ? <Power size={10} className="inline mr-1" /> : <PowerOff size={10} className="inline mr-1" />}
                      {r.active ? "Active" : "Off"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing({ ...r, max_order_value: r.max_order_value ?? "" })} data-testid={`edit-rule-${r.id}`} className="text-xs text-[#002FA7] hover:underline mr-3"><Pencil size={11} className="inline" /> Edit</button>
                    <button onClick={() => remove(r.id)} className="text-xs text-red-600 hover:underline"><Trash2 size={11} className="inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white max-w-xl w-full border border-zinc-200 shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <p className="overline text-[10px]">{editing.id ? "Edit" : "New"} Commission Rule</p>
                <h3 className="font-display text-xl font-medium mt-1">{editing.name || "Untitled"}</h3>
              </div>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-zinc-100"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormRow label="Name">
                <input data-testid="rule-name" value={editing.name} onChange={(e) => setEditing(x => ({ ...x, name: e.target.value }))}
                  placeholder="e.g. Sales Partner default, Big order bonus"
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none" />
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Applies to role">
                  <select value={editing.applies_to_role || ""} onChange={(e) => setEditing(x => ({ ...x, applies_to_role: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm bg-white focus:border-[#002FA7] outline-none">
                    {ROLES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Applies to category">
                  <select value={editing.applies_to_category_id || ""} onChange={(e) => setEditing(x => ({ ...x, applies_to_category_id: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm bg-white focus:border-[#002FA7] outline-none">
                    <option value="">Any category</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormRow>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Min order value (₹)">
                  <input type="number" min={0} value={editing.min_order_value} onChange={(e) => setEditing(x => ({ ...x, min_order_value: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
                </FormRow>
                <FormRow label="Max order value (₹) — blank = unlimited">
                  <input type="number" min={0} value={editing.max_order_value} onChange={(e) => setEditing(x => ({ ...x, max_order_value: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
                </FormRow>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormRow label="Commission %">
                  <input type="number" step="0.5" min={0} max={100} value={editing.commission_percent}
                    data-testid="rule-percent"
                    onChange={(e) => setEditing(x => ({ ...x, commission_percent: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
                </FormRow>
                <FormRow label="Priority (higher wins)">
                  <input type="number" min={0} value={editing.priority} onChange={(e) => setEditing(x => ({ ...x, priority: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
                </FormRow>
                <FormRow label="Active">
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing(x => ({ ...x, active: e.target.checked }))} />
                    <span>Enabled</span>
                  </label>
                </FormRow>
              </div>
              <p className="text-[11px] text-zinc-500">
                <b>Tip:</b> Leave role / category blank to make a rule apply to <i>all</i> partners / all products.
                Priority breaks ties — the highest-priority matching rule wins.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
              <button onClick={submit} disabled={saving} data-testid="rule-save" className="px-5 py-2 bg-[#002FA7] hover:bg-[#002277] text-white text-sm flex items-center gap-2 disabled:opacity-50">
                <Save size={13} /> {saving ? "Saving…" : "Save rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, children }) {
  return (<div><label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>{children}</div>);
}
