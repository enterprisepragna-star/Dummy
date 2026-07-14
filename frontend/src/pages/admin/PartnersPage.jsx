import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Search, UserPlus, Filter, Users, CheckCircle2, XCircle, PauseCircle, Clock, ExternalLink, KeyRound, Copy, MessageCircle, X, Mail } from "lucide-react";

const STATUS_META = {
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  approved:  { label: "Approved",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  suspended: { label: "Suspended", cls: "bg-zinc-100 text-zinc-600 border-zinc-300", icon: PauseCircle },
};

const ROLE_LABEL = {
  super_admin: "Super Admin", admin: "Admin",
  sales_manager: "Sales Manager", sales_executive: "Sales Executive",
  sales_partner: "Sales Partner", procurement_partner: "Procurement Partner",
  franchise_partner: "Franchise Partner", viewer: "Viewer",
};

export default function PartnersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (role) params.set("role", role);
      const { data } = await api.get(`/partners${params.toString() ? "?" + params : ""}`);
      setItems(data);
    } catch { toast.error("Failed to load partners"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status, role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(p =>
      (p.full_name || "").toLowerCase().includes(s) ||
      (p.email || "").toLowerCase().includes(s) ||
      (p.employee_id || "").toLowerCase().includes(s) ||
      (p.mobile || "").includes(s) ||
      (p.city || "").toLowerCase().includes(s));
  }, [items, q]);

  const counts = useMemo(() => items.reduce((a, p) => (a[p.status] = (a[p.status] || 0) + 1, a), {}), [items]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <p className="overline">OPMS</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Partners</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Review incoming partner applications, approve to auto-generate Employee ID + Partner Code, or reject / suspend.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            onClick={() => setResetOpen(true)}
            data-testid="open-reset-tool"
            className="text-xs px-3 py-1.5 border border-zinc-300 hover:border-zinc-900 flex items-center gap-1.5"
          >
            <KeyRound size={12} /> Send reset link
          </button>
          <a
            href="/partners/register"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="open-registration"
            className="text-xs px-3 py-1.5 border border-[#002FA7] text-[#002FA7] hover:bg-[#002FA7] hover:text-white flex items-center gap-1.5"
          >
            <ExternalLink size={12} /> Public registration link
          </a>
        </div>
      </div>

      {resetOpen && <ResetLinkModal onClose={() => setResetOpen(false)} />}

      {/* Stat pills */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
        <StatCard label="Total" value={items.length} onClick={() => setStatus("")} active={!status} icon={Users} />
        {["pending", "approved", "rejected", "suspended"].map((k) => {
          const M = STATUS_META[k];
          const Icon = M.icon;
          return (
            <button
              key={k}
              onClick={() => setStatus(status === k ? "" : k)}
              data-testid={`filter-${k}`}
              className={`border p-4 text-left ${status === k ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`}
            >
              <div className="flex items-center gap-2"><Icon size={12} className="text-zinc-500" /><p className="overline text-[10px]">{M.label}</p></div>
              <p className="font-display text-2xl mt-1">{counts[k] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            data-testid="partners-search"
            placeholder="Search name, email, employee id, phone, city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:border-[#002FA7] text-sm outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          data-testid="partners-role-filter"
          className="px-2 py-2 border border-zinc-300 text-sm bg-white outline-none"
        >
          <option value="">All roles</option>
          {Object.entries(ROLE_LABEL).filter(([k]) => k !== "admin" && k !== "super_admin").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-12 text-center">
          <UserPlus size={28} className="mx-auto text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600">No partners match the current filter.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3">Contact</th>
                <th className="p-3">City</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const M = STATUS_META[p.status] || STATUS_META.pending;
                return (
                  <tr key={p.id} data-testid={`partner-row-${p.id}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="p-3">
                      <p className="font-medium">{p.full_name}</p>
                      <p className="text-[11px] text-zinc-500">{p.email}</p>
                    </td>
                    <td className="p-3 text-zinc-600">{ROLE_LABEL[p.role] || p.role}</td>
                    <td className="p-3 font-mono text-[11px]">{p.employee_id || "—"}<br /><span className="text-zinc-400">{p.partner_code || ""}</span></td>
                    <td className="p-3 font-mono text-[11px]">{p.mobile}</td>
                    <td className="p-3 text-zinc-600">{p.city || "—"}</td>
                    <td className="p-3"><span className={`text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${M.cls}`}>{M.label}</span></td>
                    <td className="p-3 text-right">
                      <Link to={`/admin/opms/partners/${p.id}`} data-testid={`open-partner-${p.id}`} className="text-xs text-[#002FA7] hover:underline">Open →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, onClick, active, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`border p-4 text-left ${active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`}
    >
      <div className="flex items-center gap-2"><Icon size={12} className="text-zinc-500" /><p className="overline text-[10px]">{label}</p></div>
      <p className="font-display text-2xl mt-1">{value}</p>
    </button>
  );
}


function ResetLinkModal({ onClose }) {
  const [identifier, setIdentifier] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post("/admin/reset-link-lookup", {
        identifier: identifier.trim(),
        send_email: alsoEmail,
      });
      setResult(data);
      if (data.emailed) toast.success(`Emailed reset link to ${data.email}`);
      else if (alsoEmail) toast.warning(`Link ready — but email failed to send. Copy it manually below.`);
      else toast.success("Reset link generated");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not generate link");
    } finally {
      setBusy(false);
    }
  };

  const copy = (v) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="reset-tool-modal"
        className="bg-white w-full max-w-lg border border-zinc-200"
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="overline text-[10px]">Admin utility</p>
            <h2 className="font-display text-2xl mt-1 tracking-tight">Send password reset link</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Look up any account by email or Employee ID and issue a fresh 24-hour reset link.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-800"><X size={18} /></button>
        </div>

        {!result ? (
          <form onSubmit={submit} className="px-5 py-5">
            <label className="overline text-[10px]">Email or Employee ID</label>
            <div className="mt-2 relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                required
                autoFocus
                data-testid="reset-tool-identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="krishnachrl@gmail.com  or  ONCOST-EMP-0004"
                className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20 text-sm outline-none"
              />
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                data-testid="reset-tool-send-email"
                checked={alsoEmail}
                onChange={(e) => setAlsoEmail(e.target.checked)}
                className="accent-[#002FA7]"
              />
              Also email the link to them automatically
            </label>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              If email fails (Resend not configured / unverified domain), you can still copy the link
              below and share it manually.
            </p>

            {err && (
              <div className="mt-3 border border-red-200 bg-red-50 text-red-700 text-xs p-3">{err}</div>
            )}

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="border border-zinc-300 hover:border-zinc-900 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                data-testid="reset-tool-submit"
                className="bg-[#002FA7] hover:bg-[#002277] text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy ? "Working…" : "Generate link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 py-5" data-testid="reset-tool-result">
            <p className="overline text-[10px] text-[#002FA7]">Link ready</p>
            <p className="text-sm mt-2">
              For <b>{result.email}</b>{result.employee_id ? ` (${result.employee_id})` : ""}. Valid 24 hours, single use.
            </p>

            {result.emailed ? (
              <div className="mt-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs p-3">
                ✓ Also emailed to {result.email}
              </div>
            ) : result.email_error ? (
              <div className="mt-3 border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3">
                <b>Email delivery failed:</b> {result.email_error}
                <p className="mt-1">Copy the link below and share it via WhatsApp / SMS.</p>
              </div>
            ) : null}

            <code
              data-testid="reset-tool-link"
              className="mt-3 block font-mono text-[12px] bg-zinc-50 border border-zinc-200 px-3 py-2 break-all"
            >
              {result.reset_link}
            </code>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                data-testid="reset-tool-copy"
                onClick={() => copy(result.reset_link)}
                className="inline-flex items-center gap-1.5 bg-[#002FA7] hover:bg-[#002277] text-white px-3 py-2 text-xs"
              >
                <Copy size={12} /> Copy link
              </button>
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi, reset your ONCOST partner password here (valid 24 hrs, one-time): ${result.reset_link}`,
                )}`}
                className="inline-flex items-center gap-1.5 border border-emerald-300 text-emerald-800 hover:bg-emerald-50 px-3 py-2 text-xs"
              >
                <MessageCircle size={12} /> Share on WhatsApp
              </a>
              <button
                onClick={() => { setResult(null); setIdentifier(""); }}
                className="text-xs text-zinc-500 underline ml-auto"
              >
                Send another
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 mt-3">
              Expires: {new Date(result.expires_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
