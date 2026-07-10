import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Plus, X, Save, Search, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function IncentivesPage() {
  const [items, setItems] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [payFor, setPayFor] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/incentives");
      setItems(data);
    } catch { toast.error("Failed to load incentives"); }
  };
  useEffect(() => { load(); }, []);

  const submitPay = async () => {
    try {
      await api.post(`/incentives/${payFor.id}/pay`, {
        payment_reference: payFor.payment_reference || "",
        utr_number: payFor.utr_number || "",
        remarks: payFor.remarks || "",
      });
      toast.success("Incentive paid");
      setPayFor(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this incentive?")) return;
    await api.delete(`/incentives/${id}`);
    toast.success("Deleted"); load();
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <p className="overline">OPMS · Commission</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Incentives</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Discretionary rewards outside the standard commission rules — e.g. a partner who lands a recurring multi-year contract. No ₹1L threshold applies; you set the amount.</p>
        </div>
        <button onClick={() => setShowNew(true)} data-testid="new-incentive-btn" className="text-xs px-3 py-1.5 bg-[#002FA7] hover:bg-[#002277] text-white flex items-center gap-1.5 self-start">
          <Plus size={12} /> + Add Incentive
        </button>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-12 text-center bg-white">
          <Sparkles size={28} className="mx-auto text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600">No incentives yet.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="p-3">Partner</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Contract Ref</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status / UTR</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-3">
                    <p className="font-medium">{i.partner_name}</p>
                    <p className="text-[11px] font-mono text-zinc-500">{i.partner_code || i.partner_employee_id}</p>
                  </td>
                  <td className="p-3 text-[12px] text-zinc-600 max-w-sm">{i.reason || "—"}</td>
                  <td className="p-3 text-[12px] font-mono text-zinc-500">{i.contract_ref || "—"}</td>
                  <td className="p-3 text-right font-mono font-bold">₹ {Number(i.amount).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    {i.status === "paid" ? (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider border px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Paid</span>
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">{i.utr_number || i.payment_reference || "—"}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider border px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200"><Clock size={9} className="inline mr-1" />Pending</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {i.status === "pending" && (<button onClick={() => setPayFor({ ...i })} data-testid={`pay-incentive-${i.id}`} className="text-xs text-[#002FA7] hover:underline mr-3">Mark paid →</button>)}
                    <button onClick={() => del(i.id)} className="text-xs text-red-600 hover:underline"><XCircle size={11} className="inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewIncentiveModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {payFor && <PayModal payFor={payFor} setPayFor={setPayFor} onSubmit={submitPay} />}
    </div>
  );
}

function NewIncentiveModal({ onClose, onCreated }) {
  const [code, setCode] = useState("");
  const [lookedUp, setLookedUp] = useState(null); // partner data after lookup
  const [lookupErr, setLookupErr] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);

  const doLookup = async () => {
    setLookupErr(""); setLookedUp(null);
    if (!code.trim()) return;
    try {
      const { data } = await api.get(`/partners/lookup?code=${encodeURIComponent(code.trim())}`);
      if (data.status !== "approved") { setLookupErr(`Partner status is ${data.status} — must be approved`); return; }
      if (!data.user_id) { setLookupErr("No login account linked to this partner"); return; }
      setLookedUp(data);
    } catch (e) { setLookupErr(e?.response?.data?.detail || "Not found"); }
  };

  const submit = async () => {
    if (!lookedUp) { toast.error("Look up a partner first"); return; }
    if (!Number(amount)) { toast.error("Enter an amount"); return; }
    setSaving(true);
    try {
      await api.post("/incentives", {
        partner_user_id: lookedUp.user_id,
        amount: Number(amount),
        reason: reason.trim(),
        contract_ref: ref.trim(),
      });
      toast.success("Incentive added");
      onCreated();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white max-w-lg w-full border border-zinc-200 shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <p className="overline text-[10px]">Add Incentive</p>
            <h3 className="font-display text-xl font-medium mt-1">{lookedUp?.full_name || "Look up a partner"}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Partner code / Employee ID / Referral code</label>
            <div className="mt-2 flex items-stretch gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)}
                data-testid="incentive-code-input"
                onKeyDown={(e) => e.key === "Enter" && doLookup()}
                placeholder="e.g. OCSP0001 or ONCOST-EMP-0001"
                className="flex-1 px-3 py-2 border border-zinc-300 font-mono text-sm focus:border-[#002FA7] outline-none" />
              <button onClick={doLookup} data-testid="incentive-lookup-btn" className="px-3 py-2 border border-[#002FA7] text-[#002FA7] text-sm hover:bg-[#002FA7] hover:text-white flex items-center gap-1"><Search size={12} /> Look up</button>
            </div>
            {lookupErr && <p className="text-[11px] text-red-600 mt-2">{lookupErr}</p>}
            {lookedUp && (
              <div className="mt-3 border border-emerald-300 bg-emerald-50 p-3 text-[12px]">
                <div className="flex items-center gap-2 text-emerald-800 mb-1"><CheckCircle2 size={13} /><b>{lookedUp.full_name}</b></div>
                <p className="font-mono text-[11px] text-emerald-900">
                  {lookedUp.employee_id} · {lookedUp.partner_code} · Role: {lookedUp.role}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Incentive amount (₹)</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)}
              data-testid="incentive-amount"
              className="mt-2 w-full px-3 py-2 border border-zinc-300 font-mono text-sm focus:border-[#002FA7] outline-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Reason</label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Landed multi-year contract with Acme Corp"
              className="mt-2 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none resize-y" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Contract reference (optional)</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-zinc-300 text-sm font-mono focus:border-[#002FA7] outline-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
          <button onClick={onClose} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
          <button onClick={submit} disabled={saving || !lookedUp} data-testid="incentive-submit" className="px-5 py-2 bg-[#002FA7] hover:bg-[#002277] text-white text-sm flex items-center gap-2 disabled:opacity-50">
            <Save size={13} /> {saving ? "Adding…" : "Add incentive"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ payFor, setPayFor, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPayFor(null)}>
      <div className="bg-white max-w-md w-full border border-zinc-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200"><p className="overline text-[10px]">Pay incentive</p><h3 className="font-display text-lg mt-1">₹ {Number(payFor.amount).toLocaleString("en-IN")} → {payFor.partner_name}</h3></div>
        <div className="px-6 py-5 space-y-3">
          <input value={payFor.payment_reference || ""} onChange={(e) => setPayFor(x => ({ ...x, payment_reference: e.target.value }))} placeholder="Payment reference" className="w-full px-3 py-2 border border-zinc-300 text-sm outline-none" />
          <input value={payFor.utr_number || ""} onChange={(e) => setPayFor(x => ({ ...x, utr_number: e.target.value }))} placeholder="UTR number" className="w-full px-3 py-2 border border-zinc-300 text-sm font-mono outline-none" />
          <textarea rows={2} value={payFor.remarks || ""} onChange={(e) => setPayFor(x => ({ ...x, remarks: e.target.value }))} placeholder="Remarks" className="w-full px-3 py-2 border border-zinc-300 text-sm outline-none resize-y" />
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
          <button onClick={() => setPayFor(null)} className="px-4 py-2 border border-zinc-300 text-sm">Cancel</button>
          <button onClick={onSubmit} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Mark paid</button>
        </div>
      </div>
    </div>
  );
}
