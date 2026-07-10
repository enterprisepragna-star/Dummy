import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Coins, Wallet, CheckCircle2, Clock, Save, X, RotateCcw, Search } from "lucide-react";

export default function CommissionsPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [payFor, setPayFor] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const [{ data }, { data: s }] = await Promise.all([
        api.get(`/commissions${params.toString() ? "?" + params : ""}`),
        api.get("/commissions/summary"),
      ]);
      setItems(data); setSummary(s);
    } catch { toast.error("Failed to load commissions"); }
  };
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(c =>
      (c.partner_name || "").toLowerCase().includes(s) ||
      (c.partner_employee_id || "").toLowerCase().includes(s) ||
      (c.customer_name || "").toLowerCase().includes(s) ||
      (c.quotation_id || "").toLowerCase().includes(s) ||
      (c.utr_number || "").toLowerCase().includes(s));
  }, [items, q]);

  const submitPay = async () => {
    setSaving(true);
    try {
      await api.post(`/commissions/${payFor.id}/pay`, {
        payment_reference: payFor.payment_reference || "",
        utr_number: payFor.utr_number || "",
        remarks: payFor.remarks || "",
      });
      toast.success("Marked as paid");
      setPayFor(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const revert = async (c) => {
    if (!window.confirm("Revert this payment record? The commission goes back to pending.")) return;
    try {
      await api.post(`/commissions/${c.id}/revert`);
      toast.success("Reverted");
      load();
    } catch { toast.error("Revert failed"); }
  };

  return (
    <div>
      <div>
        <p className="overline">OPMS · Commission</p>
        <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Payout Tracker</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Every accepted sale attributed to a partner produces a commission record here. Mark them paid once the transfer is done, with UTR / reference for audit.</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-6">
          <Kpi label="Pending amount" value={`₹ ${summary.pending_amount.toLocaleString("en-IN")}`} sub={`${summary.pending_count} records`} icon={Clock} amber />
          <Kpi label="Paid amount" value={`₹ ${summary.paid_amount.toLocaleString("en-IN")}`} sub={`${summary.paid_count} records`} icon={CheckCircle2} emerald />
          <Kpi label="Total booked" value={`₹ ${summary.total_amount.toLocaleString("en-IN")}`} icon={Wallet} />
          <Kpi label="Records" value={items.length} icon={Coins} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
        <StatusChip label={`All (${items.length})`} active={!status} onClick={() => setStatus("")} />
        <StatusChip label="Pending" active={status === "pending"} onClick={() => setStatus(status === "pending" ? "" : "pending")} cls="bg-amber-50 text-amber-700 border-amber-200" />
        <StatusChip label="Paid" active={status === "paid"} onClick={() => setStatus(status === "paid" ? "" : "paid")} cls="bg-emerald-50 text-emerald-700 border-emerald-200" />
        <div className="relative flex-1 min-w-[220px] ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partner, customer, UTR…"
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 focus:border-[#002FA7] text-sm outline-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-12 text-center bg-white">
          <Coins size={28} className="mx-auto text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600">No commissions yet. Attribute a quotation to a partner and accept it to generate commission records.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="p-3">Partner</th>
                <th className="p-3">Sale</th>
                <th className="p-3 text-right">Order</th>
                <th className="p-3 text-right">Rule</th>
                <th className="p-3 text-right">Commission</th>
                <th className="p-3">Status / UTR</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} data-testid={`commission-row-${c.id}`} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-3">
                    <p className="font-medium">{c.partner_name}</p>
                    <p className="text-[11px] font-mono text-zinc-500">{c.partner_employee_id}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-[13px]">{c.customer_name || c.customer_company || "—"}</p>
                    <p className="text-[11px] font-mono text-zinc-500">{c.quotation_id}</p>
                  </td>
                  <td className="p-3 text-right font-mono">₹ {Number(c.order_amount).toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-[12px] text-zinc-500">{c.rule_name}<br /><span className="font-mono">{c.commission_percent}%</span></td>
                  <td className="p-3 text-right font-mono font-bold">₹ {Number(c.commission_amount).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    {c.status === "paid" ? (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider border px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Paid</span>
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">{c.utr_number || c.payment_reference || "—"}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider border px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {c.status === "pending" ? (
                      <button onClick={() => setPayFor({ ...c })} data-testid={`pay-${c.id}`} className="text-xs text-[#002FA7] hover:underline">Mark paid →</button>
                    ) : (
                      <button onClick={() => revert(c)} className="text-xs text-zinc-500 hover:text-red-600 inline-flex items-center gap-1"><RotateCcw size={11} /> Revert</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPayFor(null)}>
          <div className="bg-white max-w-md w-full border border-zinc-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <p className="overline text-[10px]">Mark commission as paid</p>
                <h3 className="font-display text-xl font-medium mt-1">₹ {Number(payFor.commission_amount).toLocaleString("en-IN")} → {payFor.partner_name}</h3>
              </div>
              <button onClick={() => setPayFor(null)} className="p-2 hover:bg-zinc-100"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <FormRow label="Payment reference">
                <input value={payFor.payment_reference || ""} onChange={(e) => setPayFor(x => ({ ...x, payment_reference: e.target.value }))}
                  placeholder="e.g. NEFT-2607-1  or  Cheque #123456"
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none" />
              </FormRow>
              <FormRow label="UTR number">
                <input value={payFor.utr_number || ""} onChange={(e) => setPayFor(x => ({ ...x, utr_number: e.target.value }))}
                  data-testid="utr-input"
                  placeholder="e.g. UTRICIC0000123456"
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
              </FormRow>
              <FormRow label="Remarks">
                <textarea rows={2} value={payFor.remarks || ""} onChange={(e) => setPayFor(x => ({ ...x, remarks: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none resize-y" />
              </FormRow>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
              <button onClick={() => setPayFor(null)} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
              <button onClick={submitPay} disabled={saving} data-testid="submit-pay" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex items-center gap-2 disabled:opacity-50">
                <Save size={13} /> {saving ? "Saving…" : "Mark paid"}
              </button>
            </div>
          </div>
        </div>
      )}
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
function FormRow({ label, children }) {
  return <div><label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>{children}</div>;
}
