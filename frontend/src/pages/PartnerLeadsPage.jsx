import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LogOut, LayoutDashboard, Handshake, Search, Save, Phone, Mail, Building } from "lucide-react";

const STATUS_META = {
  new:            { label: "New",             cls: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted:      { label: "Contacted",       cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  quotation_sent: { label: "Quotation Sent",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
  negotiation:    { label: "Negotiation",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  won:            { label: "Won",             cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost:           { label: "Lost",            cls: "bg-zinc-100 text-zinc-500 border-zinc-300" },
};

export default function PartnerLeadsPage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const { data } = await api.get(`/leads${params.toString() ? "?" + params : ""}`);
      setItems(data);
    } catch { toast.error("Failed to load leads"); }
  };
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(l =>
      (l.name || "").toLowerCase().includes(s) ||
      (l.company || "").toLowerCase().includes(s) ||
      (l.contact_person || "").toLowerCase().includes(s));
  }, [items, q]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/leads/${selected.id}`, {
        status: selected.status,
        notes: selected.notes,
        phone: selected.phone,
        email: selected.email,
        contact_person: selected.contact_person,
        designation: selected.designation,
        estimated_value: Number(selected.estimated_value) || 0,
        lost_reason: selected.status === "lost" ? (selected.lost_reason || "") : null,
      });
      toast.success("Lead updated");
      setSelected(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const onLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <p className="font-display text-2xl">ONCOST <span className="text-zinc-400 text-xs">Partner</span></p>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <a href="/partner/dashboard" className="text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"><LayoutDashboard size={13} /> Dashboard</a>
              <a href="/partner/leads" className="text-[#002FA7] font-medium inline-flex items-center gap-1"><Handshake size={13} /> My Leads</a>
            </nav>
          </div>
          <button onClick={onLogout} className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"><LogOut size={12} /> Sign out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="overline">CRM</p>
        <h1 className="font-display text-4xl font-light mt-1 tracking-tight">My Leads</h1>

        <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
          <button onClick={() => setStatus("")}
            className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border ${!status ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-300"}`}>All ({items.length})</button>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <button key={k} onClick={() => setStatus(status === k ? "" : k)}
              className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border ${status === k ? "bg-zinc-900 text-white border-zinc-900" : `${m.cls} hover:border-zinc-900`}`}>{m.label}</button>
          ))}
          <div className="relative flex-1 min-w-[220px] ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
              className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:border-[#002FA7] text-sm bg-white outline-none" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="border border-dashed border-zinc-300 p-12 text-center bg-white">
            <Handshake size={28} className="mx-auto text-zinc-400 mb-3" />
            <p className="text-sm text-zinc-600">No leads assigned to you yet. Your admin will assign leads here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((l) => {
              const M = STATUS_META[l.status] || STATUS_META.new;
              return (
                <button key={l.id} onClick={() => setSelected({ ...l })}
                  className="text-left bg-white border border-zinc-200 hover:border-[#002FA7] p-4 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-medium">{l.name}</p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1"><Building size={10} /> {l.company || "—"}</p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${M.cls}`}>{M.label}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-3 space-y-1">
                    {l.contact_person && <p className="flex items-center gap-1"><Phone size={9} /> {l.contact_person} · {l.phone || l.email}</p>}
                    {l.estimated_value > 0 && <p className="font-mono">₹ {Number(l.estimated_value).toLocaleString("en-IN")}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white max-w-xl w-full border border-zinc-200 shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200">
              <p className="overline text-[10px]">Update lead</p>
              <h3 className="font-display text-xl font-medium mt-1">{selected.name}</h3>
              <p className="text-[11px] text-zinc-500 mt-1">{selected.company || "—"}</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <FormRow label="Status">
                <select value={selected.status}
                  onChange={(e) => setSelected(s => ({ ...s, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm bg-white focus:border-[#002FA7] outline-none">
                  {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
              </FormRow>
              <FormRow label="Contact person">
                <input value={selected.contact_person || ""} onChange={(e) => setSelected(s => ({ ...s, contact_person: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none" />
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Phone">
                  <input value={selected.phone || ""} onChange={(e) => setSelected(s => ({ ...s, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none" />
                </FormRow>
                <FormRow label="Email">
                  <input value={selected.email || ""} onChange={(e) => setSelected(s => ({ ...s, email: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none" />
                </FormRow>
              </div>
              <FormRow label="Estimated value (₹)">
                <input type="number" value={selected.estimated_value || 0}
                  onChange={(e) => setSelected(s => ({ ...s, estimated_value: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
              </FormRow>
              <FormRow label="Notes">
                <textarea rows={4} value={selected.notes || ""}
                  onChange={(e) => setSelected(s => ({ ...s, notes: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none resize-y" />
              </FormRow>
              {selected.status === "lost" && (
                <FormRow label="Lost reason">
                  <textarea rows={2} value={selected.lost_reason || ""}
                    onChange={(e) => setSelected(s => ({ ...s, lost_reason: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none" />
                </FormRow>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
              <button onClick={() => setSelected(null)} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 bg-[#002FA7] hover:bg-[#002277] text-white text-sm flex items-center gap-2 disabled:opacity-50">
                <Save size={13} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <div><label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>{children}</div>
  );
}
