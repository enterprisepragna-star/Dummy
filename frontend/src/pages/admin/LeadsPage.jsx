import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Search, Plus, Users2, TrendingUp, Target, X, ChevronRight, Handshake } from "lucide-react";

const STATUS_META = {
  new:            { label: "New",             cls: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted:      { label: "Contacted",       cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  quotation_sent: { label: "Quotation Sent",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
  negotiation:    { label: "Negotiation",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  won:            { label: "Won",             cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost:           { label: "Lost",            cls: "bg-zinc-100 text-zinc-500 border-zinc-300" },
};
const SOURCES = ["LinkedIn", "Apollo", "Referral", "Website", "Walk-in", "Cold Call", "Event", "Other"];

export default function LeadsPage() {
  const [items, setItems] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const [{ data: leads }, { data: aList }] = await Promise.all([
        api.get(`/leads${params.toString() ? "?" + params : ""}`),
        api.get("/leads-assignees"),
      ]);
      setItems(leads); setAssignees(aList);
    } catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(l =>
      (l.name || "").toLowerCase().includes(s) ||
      (l.company || "").toLowerCase().includes(s) ||
      (l.contact_person || "").toLowerCase().includes(s) ||
      (l.email || "").toLowerCase().includes(s) ||
      (l.phone || "").includes(s) ||
      (l.assigned_to_name || "").toLowerCase().includes(s));
  }, [items, q]);

  const counts = useMemo(() => {
    const c = {};
    items.forEach(l => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [items]);
  const totalValue = useMemo(() => items.reduce((s, l) => s + (l.estimated_value || 0), 0), [items]);
  const wonValue = useMemo(() => items.filter(l => l.status === "won").reduce((s, l) => s + (l.estimated_value || 0), 0), [items]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <p className="overline">OPMS · CRM</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Leads</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Track every prospect across the pipeline. Assign to a partner (they'll get an email + it lands on their dashboard).</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          data-testid="new-lead-btn"
          className="text-xs px-3 py-1.5 bg-[#002FA7] hover:bg-[#002277] text-white flex items-center gap-1.5 self-start"
        >
          <Plus size={12} /> + New Lead
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        <Kpi label="Pipeline value" value={`₹ ${totalValue.toLocaleString("en-IN")}`} icon={Target} />
        <Kpi label="Won value" value={`₹ ${wonValue.toLocaleString("en-IN")}`} icon={TrendingUp} accent />
        <Kpi label="Active leads" value={items.filter(l => !["won","lost"].includes(l.status)).length} icon={Handshake} />
        <Kpi label="Assignees" value={assignees.length} icon={Users2} />
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <StatusChip label={`All (${items.length})`} active={!status} onClick={() => setStatus("")} />
        {Object.entries(STATUS_META).map(([k, m]) => (
          <StatusChip key={k} label={`${m.label} (${counts[k] || 0})`} active={status === k}
            onClick={() => setStatus(status === k ? "" : k)} chipCls={m.cls} />
        ))}
        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, phone, assignee…"
            data-testid="leads-search"
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:border-[#002FA7] text-sm outline-none" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-12 text-center">
          <Users2 size={28} className="mx-auto text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600">No leads yet.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 text-xs px-3 py-1.5 bg-[#002FA7] text-white">
            Create your first lead
          </button>
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="p-3">Lead</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Source</th>
                <th className="p-3">Value</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const M = STATUS_META[l.status] || STATUS_META.new;
                return (
                  <tr key={l.id} data-testid={`lead-row-${l.id}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="p-3">
                      <p className="font-medium">{l.name}</p>
                      <p className="text-[11px] text-zinc-500">{l.company || "—"}{l.industry ? ` · ${l.industry}` : ""}</p>
                    </td>
                    <td className="p-3 text-zinc-600">
                      {l.contact_person && <div className="text-[13px]">{l.contact_person}<span className="text-zinc-400 text-[11px]">{l.designation ? ` · ${l.designation}` : ""}</span></div>}
                      <div className="text-[11px] font-mono text-zinc-500">{l.phone || l.email || "—"}</div>
                    </td>
                    <td className="p-3 text-zinc-600 text-[12px]">{l.source || "—"}</td>
                    <td className="p-3 font-mono text-[12px]">{l.estimated_value ? `₹ ${Number(l.estimated_value).toLocaleString("en-IN")}` : "—"}</td>
                    <td className="p-3 text-zinc-600 text-[12px]">
                      {l.assigned_to_name
                        ? (<>{l.assigned_to_name}<div className="text-[10px] font-mono text-zinc-400">{l.assigned_to_employee_id}</div></>)
                        : <span className="text-zinc-400">Unassigned</span>}
                    </td>
                    <td className="p-3"><span className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${M.cls}`}>{M.label}</span></td>
                    <td className="p-3 text-right">
                      <Link to={`/admin/opms/leads/${l.id}`} data-testid={`open-lead-${l.id}`} className="text-xs text-[#002FA7] hover:underline inline-flex items-center gap-1">
                        Open <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewLeadModal
          assignees={assignees}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent }) {
  return (
    <div className={`border p-4 ${accent ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
      <div className="flex items-center gap-2 text-zinc-500"><Icon size={12} /><p className="overline text-[10px]">{label}</p></div>
      <p className="font-display text-2xl font-medium mt-2">{value}</p>
    </div>
  );
}
function StatusChip({ label, active, onClick, chipCls = "" }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border ${active ? "bg-zinc-900 text-white border-zinc-900" : `hover:border-zinc-900 ${chipCls || "bg-white border-zinc-300"}`}`}>
      {label}
    </button>
  );
}

function NewLeadModal({ assignees, onClose, onCreated }) {
  const [f, setF] = useState({
    name: "", company: "", industry: "", contact_person: "", designation: "",
    phone: "", email: "", source: "LinkedIn", estimated_value: "", assigned_to: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) { toast.error("Lead name is required"); return; }
    setSaving(true);
    try {
      await api.post("/leads", {
        ...f,
        estimated_value: Number(f.estimated_value) || 0,
        assigned_to: f.assigned_to || null,
      });
      toast.success("Lead created");
      onCreated();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} data-testid="new-lead-modal">
      <div className="bg-white max-w-2xl w-full border border-zinc-200 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <p className="overline text-[10px]">New Lead</p>
            <h3 className="font-display text-xl font-medium mt-1">{f.name || "Untitled"}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Lead name *" testid="lead-name" value={f.name} onChange={(v) => set("name", v)} className="md:col-span-2" />
          <Field label="Company" value={f.company} onChange={(v) => set("company", v)} />
          <Field label="Industry" value={f.industry} onChange={(v) => set("industry", v)} />
          <Field label="Contact person" value={f.contact_person} onChange={(v) => set("contact_person", v)} />
          <Field label="Designation" value={f.designation} onChange={(v) => set("designation", v)} />
          <Field label="Phone" value={f.phone} onChange={(v) => set("phone", v)} />
          <Field label="Email" value={f.email} onChange={(v) => set("email", v)} type="email" />
          <Field label="Source" as="select" options={SOURCES} value={f.source} onChange={(v) => set("source", v)} />
          <Field label="Estimated value (₹)" value={f.estimated_value} onChange={(v) => set("estimated_value", v)} type="number" />
          <Field label="Assign to (partner)" testid="lead-assignee" as="select"
            options={["", ...assignees.map(a => a.id)]}
            optionLabels={{ "": "— Unassigned —", ...Object.fromEntries(assignees.map(a => [a.id, `${a.name} · ${a.employee_id || a.email}`])) }}
            value={f.assigned_to} onChange={(v) => set("assigned_to", v)} className="md:col-span-2" />
          <Field label="Notes" as="textarea" value={f.notes} onChange={(v) => set("notes", v)} className="md:col-span-2" />
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
          <button onClick={onClose} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
          <button onClick={submit} disabled={saving} data-testid="lead-submit"
            className="px-5 py-2 bg-[#002FA7] hover:bg-[#002277] text-white text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Create lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, as, type = "text", options, optionLabels, className = "", testid }) {
  const cls = "mt-2 w-full border border-zinc-300 focus:border-[#002FA7] px-3 py-2 text-sm outline-none";
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>
      {as === "textarea" ? (
        <textarea rows={2} data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={cls + " resize-y"} />
      ) : as === "select" ? (
        <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={cls + " bg-white"}>
          {options.map((opt) => (<option key={opt} value={opt}>{optionLabels?.[opt] || opt || "—"}</option>))}
        </select>
      ) : (
        <input data-testid={testid} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
