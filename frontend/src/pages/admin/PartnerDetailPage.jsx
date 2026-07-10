import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api, { imageUrl } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, PauseCircle, Download, Copy, User2, IdCard, Phone, Mail, Landmark, HeartPulse, FileText } from "lucide-react";

const STATUS_META = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "Suspended", cls: "bg-zinc-100 text-zinc-600 border-zinc-300" },
};
const ROLE_LABEL = { sales_partner: "Sales Partner", sales_executive: "Sales Executive", sales_manager: "Sales Manager", procurement_partner: "Procurement Partner", franchise_partner: "Franchise Partner", viewer: "Viewer", admin: "Admin", super_admin: "Super Admin" };

export default function PartnerDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [approveResult, setApproveResult] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/partners/${id}`);
      setP(data);
    } catch {
      toast.error("Partner not found");
      nav("/admin/opms/partners");
    }
  };
  useEffect(() => { load(); }, [id]);

  if (!p) return <p className="text-sm text-zinc-500">Loading…</p>;
  const M = STATUS_META[p.status] || STATUS_META.pending;

  const call = async (fn) => { setBusy(true); try { await fn(); await load(); } catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); } finally { setBusy(false); } };

  const onApprove = async () => {
    if (!window.confirm(`Approve ${p.full_name}? This creates a login account and assigns Employee ID + Partner Code.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/partners/${id}/approve`);
      setApproveResult(data);
      toast.success(`Approved — ${data.employee_id}`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Approve failed");
    } finally {
      setBusy(false);
    }
  };
  const onReject = () => call(() => api.post(`/partners/${id}/reject`, { reason }).then(() => toast.success("Rejected")));
  const onSuspend = () => call(() => api.post(`/partners/${id}/suspend`, { reason }).then((r) => toast.success(`Status → ${r.data.status}`)));
  const downloadIdCard = async () => {
    try {
      const res = await api.get(`/partners/${id}/id-card.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `ONCOST-IDCARD-${p.employee_id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("ID card download failed"); }
  };
  const copy = (v) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="max-w-5xl">
      <Link to="/admin/opms/partners" className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"><ArrowLeft size={12} /> All partners</Link>

      {/* Header */}
      <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {p.photo ? (
            <img src={imageUrl(p.photo)} alt={p.full_name} className="w-20 h-20 rounded-full object-cover border border-zinc-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center"><User2 size={28} className="text-zinc-400" /></div>
          )}
          <div>
            <p className="overline text-[10px]">{ROLE_LABEL[p.role] || p.role}</p>
            <h1 className="font-display text-3xl font-medium mt-1">{p.full_name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${M.cls}`}>{M.label}</span>
              {p.employee_id && <span className="font-mono text-[11px] text-zinc-600">{p.employee_id}</span>}
              {p.partner_code && <span className="font-mono text-[11px] text-zinc-500">/ {p.partner_code}</span>}
              {p.referral_code && <span className="font-mono text-[11px] text-emerald-700">ref: {p.referral_code}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.status === "pending" && (
            <button onClick={onApprove} disabled={busy} data-testid="approve-btn" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              <CheckCircle2 size={14} /> Approve
            </button>
          )}
          {p.status === "approved" && (
            <button onClick={downloadIdCard} data-testid="download-idcard" className="bg-[#002FA7] hover:bg-[#002277] text-white px-4 py-2 text-sm flex items-center gap-2">
              <Download size={14} /> ID Card PDF
            </button>
          )}
          {p.status !== "rejected" && p.status !== "pending" && (
            <button onClick={onSuspend} disabled={busy} data-testid="suspend-btn" className="border border-zinc-300 hover:border-zinc-900 px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              <PauseCircle size={14} /> {p.status === "suspended" ? "Reactivate" : "Suspend"}
            </button>
          )}
          {p.status === "pending" && (
            <button onClick={onReject} disabled={busy} data-testid="reject-btn" className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              <XCircle size={14} /> Reject
            </button>
          )}
        </div>
      </div>

      {/* Approve modal-like result banner */}
      {approveResult && (
        <div className="mt-6 border border-emerald-300 bg-emerald-50 p-5">
          <p className="overline text-[10px] text-emerald-900">Approved — share these credentials with the partner</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CredCell label="Employee ID" value={approveResult.employee_id} copy={copy} />
            <CredCell label="Partner Code" value={approveResult.partner_code} copy={copy} />
            <CredCell label="Referral Code" value={approveResult.referral_code} copy={copy} />
            <CredCell label="Login (Email)" value={approveResult.email} copy={copy} />
            <CredCell label="Temporary Password" value={approveResult.temp_password} copy={copy} highlight />
          </div>
          <p className="text-[11px] text-emerald-800 mt-3">
            The partner can sign in at <b>/login</b> using either the email or Employee ID with this temporary password.
            (Email automation will be wired in the next release — for now, share manually.)
          </p>
          <button onClick={() => setApproveResult(null)} className="mt-3 text-xs text-emerald-800 underline">Dismiss</button>
        </div>
      )}

      {/* Reason field for reject/suspend */}
      {(p.status === "pending" || p.status === "approved") && (
        <div className="mt-6">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500">Reason (only used for Reject / Suspend)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="reason-input"
            className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none"
            placeholder="Optional note visible to admins" />
        </div>
      )}

      {/* Data sections */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Personal" icon={IdCard}>
          <Row k="Gender" v={p.gender} />
          <Row k="Date of Birth" v={p.dob} />
          <Row k="PAN" v={p.pan} mono />
          <Row k="Aadhaar" v={p.aadhaar} mono />
        </Section>
        <Section title="Contact" icon={Phone}>
          <Row k="Mobile" v={p.mobile} mono />
          <Row k="Alt Mobile" v={p.alt_mobile} mono />
          <Row k="Email" v={p.email} />
          <Row k="Address" v={p.address} />
          <Row k="City / State" v={[p.city, p.state].filter(Boolean).join(", ")} />
          <Row k="Pincode" v={p.pincode} mono />
        </Section>
        <Section title="Professional" icon={Mail}>
          <Row k="Role" v={ROLE_LABEL[p.role] || p.role} />
          <Row k="Department" v={p.department} />
          <Row k="Territory" v={p.territory} />
          <Row k="Working Area" v={p.working_area} />
          <Row k="Languages" v={(p.languages || []).join(", ")} />
          <Row k="Experience" v={p.previous_experience} />
          <Row k="LinkedIn" v={p.linkedin ? <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#002FA7] underline">Open</a> : ""} />
          <Row k="Resume" v={p.resume ? <a href={imageUrl(p.resume)} target="_blank" rel="noopener noreferrer" className="text-[#002FA7] inline-flex items-center gap-1"><FileText size={12}/> View</a> : "—"} />
        </Section>
        <Section title="Bank" icon={Landmark}>
          <Row k="Account Holder" v={p.account_holder} />
          <Row k="Bank" v={p.bank_name} />
          <Row k="Account Number" v={p.account_number} mono />
          <Row k="IFSC" v={p.ifsc} mono />
          <Row k="UPI" v={p.upi_id} />
        </Section>
        <Section title="Emergency" icon={HeartPulse}>
          <Row k="Name" v={p.emergency_name} />
          <Row k="Phone" v={p.emergency_phone} mono />
          <Row k="Relation" v={p.emergency_relation} />
        </Section>
        <Section title="System">
          <Row k="Employee ID" v={p.employee_id} mono />
          <Row k="Partner Code" v={p.partner_code} mono />
          <Row k="Referral Code" v={p.referral_code} mono />
          <Row k="Joining Date" v={(p.joining_date || "").split("T")[0]} />
          <Row k="Card Valid Until" v={(p.card_valid_until || "").split("T")[0]} />
          <Row k="Registered On" v={(p.created_at || "").split("T")[0]} />
          <Row k="Approved By" v={p.approved_by} />
          <Row k="Status Reason" v={p.status_reason} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3 flex items-center gap-2">
        {Icon && <Icon size={13} className="text-[#002FA7]" />}
        <p className="overline text-[10px]">{title}</p>
      </div>
      <div className="p-4 space-y-2 text-sm">{children}</div>
    </div>
  );
}
function Row({ k, v, mono }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-zinc-500 text-[11px] uppercase tracking-wider">{k}</span>
      <span className={`col-span-2 ${mono ? "font-mono text-[13px]" : ""}`}>{v || <span className="text-zinc-300">—</span>}</span>
    </div>
  );
}
function CredCell({ label, value, copy, highlight }) {
  return (
    <div className={`border p-3 ${highlight ? "border-emerald-400 bg-white" : "border-emerald-200 bg-white/60"}`}>
      <p className="text-[10px] uppercase tracking-wider text-emerald-800">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-sm break-all">{value}</span>
        <button onClick={() => copy(value)} className="text-emerald-800 hover:text-emerald-900"><Copy size={12} /></button>
      </div>
    </div>
  );
}
