import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Coins, Clock, CheckCircle2 } from "lucide-react";
import { PartnerHeader } from "@/pages/PartnerProfilePage";

export default function PartnerCommissionsPage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const [{ data }, { data: s }] = await Promise.all([
        api.get(`/commissions${params.toString() ? "?" + params : ""}`),
        api.get("/commissions/summary"),
      ]);
      setItems(data); setSummary(s);
    } catch { toast.error("Failed to load"); }
  };
  useEffect(() => { load(); }, [status]);

  const onLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className="min-h-screen bg-zinc-50">
      <PartnerHeader onLogout={onLogout} active="commissions" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="overline">Ledger</p>
        <h1 className="font-display text-4xl font-light mt-1 tracking-tight">My Commissions</h1>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-6">
            <Kpi label="Pending" value={`₹ ${summary.pending_amount.toLocaleString("en-IN")}`} sub={`${summary.pending_count} records`} icon={Clock} amber />
            <Kpi label="Paid" value={`₹ ${summary.paid_amount.toLocaleString("en-IN")}`} sub={`${summary.paid_count} records`} icon={CheckCircle2} emerald />
            <Kpi label="Total earned" value={`₹ ${summary.total_amount.toLocaleString("en-IN")}`} icon={Coins} />
          </div>
        )}

        <div className="flex items-center gap-2 mt-6 mb-4">
          <StatusChip label={`All (${items.length})`} active={!status} onClick={() => setStatus("")} />
          <StatusChip label="Pending" active={status === "pending"} onClick={() => setStatus(status === "pending" ? "" : "pending")} cls="bg-amber-50 text-amber-700 border-amber-200" />
          <StatusChip label="Paid" active={status === "paid"} onClick={() => setStatus(status === "paid" ? "" : "paid")} cls="bg-emerald-50 text-emerald-700 border-emerald-200" />
        </div>

        {items.length === 0 ? (
          <div className="border border-dashed border-zinc-300 p-12 text-center bg-white">
            <Coins size={28} className="mx-auto text-zinc-400 mb-3" />
            <p className="text-sm text-zinc-600">You don't have any commissions yet. Sales attributed to you will show up here.</p>
          </div>
        ) : (
          <div className="border border-zinc-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="p-3">Sale</th>
                  <th className="p-3 text-right">Order</th>
                  <th className="p-3 text-right">Rule</th>
                  <th className="p-3 text-right">Commission</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="p-3">
                      <p className="text-[13px]">{c.customer_name || c.customer_company || "—"}</p>
                      <p className="text-[11px] font-mono text-zinc-500">{c.quotation_id} · {(c.created_at || "").split("T")[0]}</p>
                    </td>
                    <td className="p-3 text-right font-mono">₹ {Number(c.order_amount).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right text-[12px] text-zinc-500">{c.rule_name}<br /><span className="font-mono">{c.commission_percent}%</span></td>
                    <td className="p-3 text-right font-mono font-bold">₹ {Number(c.commission_amount).toLocaleString("en-IN")}</td>
                    <td className="p-3">
                      {c.status === "paid" ? (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider border px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Paid</span>
                          <p className="text-[10px] font-mono text-zinc-500 mt-1">{c.utr_number || c.payment_reference || ""}</p>
                          <p className="text-[10px] text-zinc-400">on {(c.paid_at || "").split("T")[0]}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider border px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, amber, emerald }) {
  const bg = emerald ? "border-emerald-300 bg-emerald-50" : amber ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white";
  return (
    <div className={`border p-4 ${bg}`}>
      <div className="flex items-center gap-2 text-zinc-600"><Icon size={12} /><p className="overline text-[10px]">{label}</p></div>
      <p className="font-display text-2xl font-medium mt-2">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
function StatusChip({ label, active, onClick, cls = "" }) {
  return (
    <button onClick={onClick} className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border ${active ? "bg-zinc-900 text-white border-zinc-900" : `hover:border-zinc-900 ${cls || "bg-white border-zinc-300"}`}`}>{label}</button>
  );
}
