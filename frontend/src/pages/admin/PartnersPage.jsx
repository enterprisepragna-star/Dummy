import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Search, UserPlus, Filter, Users, CheckCircle2, XCircle, PauseCircle, Clock, ExternalLink } from "lucide-react";

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
        <a
          href="/partners/register"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="open-registration"
          className="text-xs px-3 py-1.5 border border-[#002FA7] text-[#002FA7] hover:bg-[#002FA7] hover:text-white flex items-center gap-1.5 self-start"
        >
          <ExternalLink size={12} /> Public registration link
        </a>
      </div>

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
