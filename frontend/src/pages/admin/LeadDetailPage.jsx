import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Send, Building, Phone, Mail, User2, IndianRupee, Sparkles } from "lucide-react";

const STATUS_META = {
  new:            { label: "New",             cls: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted:      { label: "Contacted",       cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  quotation_sent: { label: "Quotation Sent",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
  negotiation:    { label: "Negotiation",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  won:            { label: "Won",             cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost:           { label: "Lost",            cls: "bg-zinc-100 text-zinc-500 border-zinc-300" },
};
const SOURCES = ["LinkedIn", "Apollo", "Referral", "Website", "Walk-in", "Cold Call", "Event", "Other"];

export default function LeadDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    try {
      const [{ data }, { data: aList }] = await Promise.all([
        api.get(`/leads/${id}`), api.get("/leads-assignees"),
      ]);
      setLead(data); setAssignees(aList); setDirty(false);
    } catch { toast.error("Lead not found"); nav("/admin/opms/leads"); }
  };
  useEffect(() => { load(); }, [id]);

  if (!lead) return <p className="text-sm text-zinc-500">Loading…</p>;
  const M = STATUS_META[lead.status] || STATUS_META.new;
  const set = (k, v) => { setLead(x => ({ ...x, [k]: v })); setDirty(true); };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: lead.name, company: lead.company, industry: lead.industry,
        contact_person: lead.contact_person, designation: lead.designation,
        phone: lead.phone, email: lead.email, source: lead.source,
        status: lead.status, notes: lead.notes,
        estimated_value: Number(lead.estimated_value) || 0,
        lost_reason: lead.lost_reason || null,
      };
      await api.patch(`/leads/${id}`, body);
      toast.success("Saved");
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    finally { setBusy(false); }
  };

  const assign = async (user_id) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/leads/${id}/assign`, { user_id });
      const em = data?.email;
      if (em?.ok) toast.success("Reassigned + email sent");
      else if (em?.reason?.includes("testing emails")) toast.warning("Reassigned. Resend still in testing mode — email skipped.");
      else toast.success("Reassigned");
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Reassign failed"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Deleted");
      nav("/admin/opms/leads");
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="max-w-5xl">
      <Link to="/admin/opms/leads" className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"><ArrowLeft size={12} /> All leads</Link>

      <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="overline text-[10px]">Lead</p>
          <h1 className="font-display text-3xl font-medium mt-1">{lead.name || "Untitled"}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px] text-zinc-500">
            {lead.company && <span className="inline-flex items-center gap-1"><Building size={11} /> {lead.company}</span>}
            {lead.industry && <span>· {lead.industry}</span>}
            <span className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${M.cls}`}>{M.label}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={!dirty || busy} data-testid="lead-save"
            className="bg-[#002FA7] hover:bg-[#002277] text-white px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-40">
            <Save size={14} /> Save
          </button>
          <button onClick={remove} disabled={busy} className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-40">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Company & Contact">
          <Field label="Lead name" value={lead.name || ""} onChange={(v) => set("name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company" value={lead.company || ""} onChange={(v) => set("company", v)} />
            <Field label="Industry" value={lead.industry || ""} onChange={(v) => set("industry", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person" value={lead.contact_person || ""} onChange={(v) => set("contact_person", v)} />
            <Field label="Designation" value={lead.designation || ""} onChange={(v) => set("designation", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={lead.phone || ""} onChange={(v) => set("phone", v)} icon={Phone} />
            <Field label="Email" value={lead.email || ""} onChange={(v) => set("email", v)} icon={Mail} />
          </div>
        </Section>

        <Section title="Sales">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source" as="select" options={SOURCES} value={lead.source || "Other"} onChange={(v) => set("source", v)} />
            <Field label="Status" as="select" options={Object.keys(STATUS_META)}
              optionLabels={Object.fromEntries(Object.entries(STATUS_META).map(([k, m]) => [k, m.label]))}
              value={lead.status || "new"} onChange={(v) => set("status", v)} testid="lead-status" />
          </div>
          <Field label="Estimated value (₹)" type="number" icon={IndianRupee} value={lead.estimated_value || 0} onChange={(v) => set("estimated_value", v)} />
          {lead.status === "lost" && (
            <Field label="Lost reason" as="textarea" value={lead.lost_reason || ""} onChange={(v) => set("lost_reason", v)} />
          )}
        </Section>

        <Section title="Assignment" className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Currently assigned to</p>
              <p className="mt-1 text-sm">
                {lead.assigned_to_name ? (
                  <>{lead.assigned_to_name} <span className="text-zinc-400 font-mono text-[11px]">· {lead.assigned_to_employee_id}</span></>
                ) : <span className="text-zinc-400">Unassigned</span>}
              </p>
              {lead.assigned_at && <p className="text-[11px] text-zinc-500 mt-1">Since {lead.assigned_at.split("T")[0]}</p>}
            </div>
            <div className="flex items-center gap-2">
              <select onChange={(e) => e.target.value && assign(e.target.value)} defaultValue=""
                data-testid="reassign-select"
                className="px-3 py-2 border border-zinc-300 text-sm bg-white outline-none">
                <option value="">— Reassign to —</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.name} · {a.employee_id || a.email}</option>)}
              </select>
              <Send size={14} className="text-zinc-400" title="Reassignment triggers an email to the new partner" />
            </div>
          </div>
        </Section>

        <Section title="Notes" className="lg:col-span-2">
          <Field label="Notes" as="textarea" rows={5} value={lead.notes || ""} onChange={(v) => set("notes", v)} />
        </Section>

        <Section title="System" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            <KV k="Created" v={(lead.created_at || "").split("T")[0]} />
            <KV k="Updated" v={(lead.updated_at || "").split("T")[0]} />
            <KV k="Closed" v={(lead.closed_at || "").split("T")[0] || "—"} />
            <KV k="Created by" v={lead.created_by || "—"} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, className = "", children }) {
  return (
    <div className={`border border-zinc-200 bg-white ${className}`}>
      <div className="border-b border-zinc-200 px-4 py-3 flex items-center gap-2">
        <Sparkles size={11} className="text-[#002FA7]" />
        <p className="overline text-[10px]">{title}</p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, as, type = "text", options, optionLabels, icon: Icon, rows = 2, testid }) {
  const cls = "mt-2 w-full border border-zinc-300 focus:border-[#002FA7] px-3 py-2 text-sm outline-none";
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">{Icon && <Icon size={10} />} {label}</label>
      {as === "textarea" ? (
        <textarea rows={rows} data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={cls + " resize-y"} />
      ) : as === "select" ? (
        <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={cls + " bg-white"}>
          {options.map((opt) => <option key={opt} value={opt}>{optionLabels?.[opt] || opt}</option>)}
        </select>
      ) : (
        <input data-testid={testid} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
function KV({ k, v }) {
  return (<div><p className="text-[10px] uppercase tracking-wider text-zinc-500">{k}</p><p className="mt-1 font-mono">{v || "—"}</p></div>);
}
