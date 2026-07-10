import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LogOut, LayoutDashboard, Handshake, Coins, User2, Save, KeyRound, Landmark, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";

export default function PartnerProfilePage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [form, setForm] = useState(null);
  const [savingKyc, setSavingKyc] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const load = async () => {
    const { data } = await api.get("/partner/me");
    setMe(data);
    setForm(data.partner || {});
  };
  useEffect(() => { load(); }, []);

  const onLogout = async () => { await logout(); nav("/login"); };
  const set = (k, v) => setForm(x => ({ ...x, [k]: v }));

  const savePw = async () => {
    if (pw.new_password.length < 8) return toast.error("New password must be at least 8 characters");
    if (pw.new_password !== pw.confirm) return toast.error("Passwords do not match");
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", { current_password: pw.current_password, new_password: pw.new_password });
      toast.success("Password updated");
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setSavingPw(false); }
  };

  const saveKyc = async () => {
    setSavingKyc(true);
    try {
      const body = Object.fromEntries(
        ["full_name","gender","dob","aadhaar","pan","mobile","alt_mobile","address","city","state","pincode","linkedin"]
        .map(k => [k, form[k] || ""])
      );
      await api.patch("/partner/me", body);
      toast.success("KYC details updated");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setSavingKyc(false); }
  };

  const saveBank = async () => {
    setSavingBank(true);
    try {
      const body = Object.fromEntries(
        ["account_holder","account_number","ifsc","bank_name","upi_id"].map(k => [k, form[k] || ""])
      );
      await api.patch("/partner/me", body);
      toast.success("Bank details submitted — awaiting admin verification");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
    finally { setSavingBank(false); }
  };

  if (!me || !form) return <div className="p-10 text-sm text-zinc-500">Loading…</div>;
  const p = form;
  const bankVerified = p.bank_verified === true;

  return (
    <div className="min-h-screen bg-zinc-50">
      <PartnerHeader onLogout={onLogout} active="profile" />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="overline">Account</p>
        <h1 className="font-display text-4xl font-light mt-1 tracking-tight">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-2">Keep your details current, verify your bank account (required before commission release), and change your password.</p>

        {/* Change Password */}
        <Panel icon={KeyRound} title="Change Password" subtitle="Recommended after first login.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Current password" type="password" value={pw.current_password} onChange={(v) => setPw(x => ({ ...x, current_password: v }))} testid="pw-current" />
            <Field label="New password" type="password" value={pw.new_password} onChange={(v) => setPw(x => ({ ...x, new_password: v }))} testid="pw-new" />
            <Field label="Confirm new password" type="password" value={pw.confirm} onChange={(v) => setPw(x => ({ ...x, confirm: v }))} testid="pw-confirm" />
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={savePw} disabled={savingPw} data-testid="pw-save" className="px-4 py-2 bg-[#002FA7] text-white text-sm flex items-center gap-2 disabled:opacity-50">
              <Save size={13} /> {savingPw ? "Saving…" : "Update password"}
            </button>
          </div>
        </Panel>

        {/* KYC */}
        <Panel icon={User2} title="Personal & KYC" subtitle="Please make sure these match your official records.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name" value={p.full_name} onChange={(v) => set("full_name", v)} />
            <Field label="Gender" as="select" options={["","Male","Female","Other","Prefer not to say"]} value={p.gender} onChange={(v) => set("gender", v)} />
            <Field label="Date of birth" type="date" value={p.dob} onChange={(v) => set("dob", v)} />
            <Field label="PAN" value={p.pan} onChange={(v) => set("pan", (v||"").toUpperCase())} />
            <Field label="Aadhaar" value={p.aadhaar} onChange={(v) => set("aadhaar", v)} />
            <Field label="LinkedIn" value={p.linkedin} onChange={(v) => set("linkedin", v)} />
            <Field label="Mobile" value={p.mobile} onChange={(v) => set("mobile", v)} />
            <Field label="Alt mobile" value={p.alt_mobile} onChange={(v) => set("alt_mobile", v)} />
            <Field label="Address" value={p.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
            <Field label="City" value={p.city} onChange={(v) => set("city", v)} />
            <Field label="State" value={p.state} onChange={(v) => set("state", v)} />
            <Field label="Pincode" value={p.pincode} onChange={(v) => set("pincode", v)} />
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={saveKyc} disabled={savingKyc} data-testid="kyc-save" className="px-4 py-2 bg-[#002FA7] text-white text-sm flex items-center gap-2 disabled:opacity-50">
              <Save size={13} /> {savingKyc ? "Saving…" : "Update details"}
            </button>
          </div>
        </Panel>

        {/* Bank */}
        <Panel icon={Landmark} title="Bank Account (for commission release)" subtitle="After you save, an admin verifies these details before your first payout.">
          <div className={`mb-4 border p-3 flex items-start gap-2 text-[12px] ${bankVerified ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
            {bankVerified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <div>
              {bankVerified ? (
                <>Verified on {(p.bank_verified_at || "").split("T")[0]}. Commissions can be released to this account.</>
              ) : (
                <>Not yet verified — please double-check the numbers below and save. Payouts are blocked until an admin verifies your bank details.</>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Account holder name" value={p.account_holder} onChange={(v) => set("account_holder", v)} />
            <Field label="Bank name" value={p.bank_name} onChange={(v) => set("bank_name", v)} />
            <Field label="Account number" value={p.account_number} onChange={(v) => set("account_number", v)} />
            <Field label="IFSC" value={p.ifsc} onChange={(v) => set("ifsc", (v||"").toUpperCase())} />
            <Field label="UPI (for smaller payouts)" value={p.upi_id} onChange={(v) => set("upi_id", v)} className="sm:col-span-2" />
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={saveBank} disabled={savingBank} data-testid="bank-save" className="px-4 py-2 bg-[#002FA7] text-white text-sm flex items-center gap-2 disabled:opacity-50">
              <Save size={13} /> {savingBank ? "Saving…" : "Update bank details"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function PartnerHeader({ onLogout, active }) {
  const catalogUrl = (process.env.REACT_APP_BACKEND_URL || window.location.origin).replace(/\/api$/, "");
  const shareOnWhatsApp = () => {
    const link = `${window.location.origin}/catalog`;
    const text = `Check out the ONCOST corporate gifting catalog: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  return (
    <header className="bg-white border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <p className="font-display text-2xl">ONCOST <span className="text-zinc-400 text-xs">Partner</span></p>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <NavLink href="/partner/dashboard" active={active === "dashboard"} icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink href="/partner/leads" active={active === "leads"} icon={Handshake}>My Leads</NavLink>
            <NavLink href="/partner/commissions" active={active === "commissions"} icon={Coins}>Commissions</NavLink>
            <NavLink href="/catalog" active={active === "catalog"} icon={BookOpen}>Catalog</NavLink>
            <NavLink href="/partner/profile" active={active === "profile"} icon={User2}>Profile</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={shareOnWhatsApp} data-testid="partner-whatsapp-share" className="text-xs px-2 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1">
            <WhatsAppGlyph /> Share catalog
          </button>
          <button onClick={onLogout} className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"><LogOut size={12} /> Sign out</button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, icon: Icon, children }) {
  return (
    <a href={href} className={`inline-flex items-center gap-1 ${active ? "text-[#002FA7] font-medium" : "text-zinc-500 hover:text-zinc-900"}`}>
      <Icon size={13} /> {children}
    </a>
  );
}
function WhatsAppGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.9.5 3.7 1.45 5.29L2 22l4.94-1.29a9.87 9.87 0 0 0 5.1 1.39h.01c5.46 0 9.9-4.44 9.9-9.9C21.95 6.44 17.5 2 12.04 2Zm5.79 14.09c-.24.68-1.38 1.32-1.93 1.36-.49.04-1.09.06-1.76-.11-.4-.1-.92-.28-1.58-.56-2.78-1.2-4.6-4-4.74-4.19-.14-.19-1.13-1.5-1.13-2.86s.72-2.03.98-2.31c.26-.28.56-.35.75-.35.19 0 .38 0 .55.01.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.51-.09.19-.14.31-.28.48-.14.17-.29.38-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.22 1.36.28.14.44.12.6-.07.16-.19.7-.81.88-1.09.19-.28.38-.24.63-.14.26.09 1.65.78 1.94.92.28.14.47.21.54.33.07.12.07.68-.17 1.35Z"/>
    </svg>
  );
}

function Panel({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mt-6 bg-white border border-zinc-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-[#002FA7]" />
        <p className="overline text-[10px]">{title}</p>
      </div>
      {subtitle && <p className="text-[12px] text-zinc-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", as, options, className = "", testid }) {
  const cls = "mt-2 w-full border border-zinc-300 focus:border-[#002FA7] px-3 py-2 text-sm outline-none";
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>
      {as === "select" ? (
        <select data-testid={testid} value={value || ""} onChange={(e) => onChange(e.target.value)} className={cls + " bg-white"}>
          {options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
        </select>
      ) : (
        <input data-testid={testid} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
