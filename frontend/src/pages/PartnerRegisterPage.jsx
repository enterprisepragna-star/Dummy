import React, { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Upload, CheckCircle2, User2, Phone, Briefcase, Landmark, HeartPulse, Camera } from "lucide-react";

const ROLE_OPTIONS = [
  { v: "sales_partner", l: "Sales Partner" },
  { v: "sales_executive", l: "Sales Executive" },
  { v: "sales_manager", l: "Sales Manager" },
  { v: "procurement_partner", l: "Procurement Partner" },
  { v: "franchise_partner", l: "Franchise Partner" },
  { v: "viewer", l: "Viewer" },
];

export default function PartnerRegisterPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    // Personal
    full_name: "", gender: "", dob: "", aadhaar: "", pan: "", photo: null,
    // Contact
    mobile: "", alt_mobile: "", email: "", address: "", city: "", state: "", pincode: "",
    // Professional
    role: "sales_partner", department: "", territory: "", working_area: "",
    languages: "", previous_experience: "", linkedin: "",
    resume: null, pan_doc: null, aadhaar_doc: null,
    // Bank
    account_holder: "", account_number: "", ifsc: "", bank_name: "", upi_id: "",
    // Emergency
    emergency_name: "", emergency_phone: "", emergency_relation: "",
  });

  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const uploadFile = async (kind, file) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post(`/partners/upload?kind=${kind}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    return data.filename;
  };

  const submit = async () => {
    if (!f.full_name.trim() || !f.email.trim() || !f.mobile.trim()) {
      toast.error("Name, email and mobile are required");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const [photo, resume, pan_doc, aadhaar_doc] = await Promise.all([
        uploadFile("photo", f.photo),
        uploadFile("resume", f.resume),
        uploadFile("pan_doc", f.pan_doc),
        uploadFile("aadhaar_doc", f.aadhaar_doc),
      ]);
      const payload = {
        ...f,
        photo, resume, pan_doc, aadhaar_doc,
        languages: f.languages.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.post("/partners/register", payload);
      setDone(true);
    } catch (e) {
      const msg = e?.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="text-emerald-600" size={28} />
          </div>
          <h1 className="font-display text-3xl mt-6">Application received</h1>
          <p className="text-sm text-zinc-500 mt-3">
            Thank you for registering with ONCOST. Your application is now under review by our team.
            You will receive an email with your Employee ID and login credentials once approved.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Link to="/login" className="w-full bg-[#002FA7] hover:bg-[#002277] text-white py-3 text-sm">Go to Login</Link>
            <Link to="/catalog" className="w-full border border-zinc-300 hover:border-zinc-900 py-3 text-sm">Browse Catalog</Link>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { n: 1, label: "Personal", icon: User2 },
    { n: 2, label: "Contact", icon: Phone },
    { n: 3, label: "Professional", icon: Briefcase },
    { n: 4, label: "Bank + Emergency", icon: Landmark },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-tight">ONCOST</Link>
          <Link to="/login" className="text-xs text-zinc-500 hover:text-zinc-900">Already a partner? Sign in →</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="overline">Partner Program</p>
        <h1 className="font-display text-4xl sm:text-5xl font-light mt-1 tracking-tight">Join the ONCOST network</h1>
        <p className="text-zinc-500 text-sm mt-3 max-w-2xl">
          Register once. Once your application is approved, you'll receive an Employee ID, Partner Code and login
          credentials for the ONCOST Partner portal.
        </p>

        {/* Step indicator */}
        <div className="mt-8 grid grid-cols-4 gap-2 text-xs">
          {steps.map(s => {
            const Icon = s.icon;
            const active = s.n === step;
            const passed = s.n < step;
            return (
              <div key={s.n} className={`p-3 border-t-2 ${passed ? "border-emerald-500" : active ? "border-[#002FA7]" : "border-zinc-300"}`}>
                <div className="flex items-center gap-2">
                  <Icon size={14} className={active || passed ? "text-zinc-900" : "text-zinc-400"} />
                  <span className={active || passed ? "text-zinc-900" : "text-zinc-400"}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white border border-zinc-200 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <SectionTitle>Personal Information</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name *" testid="reg-fullname" value={f.full_name} onChange={(v) => set("full_name", v)} />
                <Field label="Gender" as="select" options={["", "Male", "Female", "Other", "Prefer not to say"]} value={f.gender} onChange={(v) => set("gender", v)} />
                <Field label="Date of Birth" type="date" value={f.dob} onChange={(v) => set("dob", v)} />
                <Field label="Aadhaar Number" value={f.aadhaar} onChange={(v) => set("aadhaar", v)} />
                <Field label="PAN Number" value={f.pan} onChange={(v) => set("pan", v.toUpperCase())} />
                <FileField label="Profile Photo" icon={Camera} accept="image/*" file={f.photo} onChange={(file) => set("photo", file)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <SectionTitle>Contact Details</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mobile Number *" testid="reg-mobile" value={f.mobile} onChange={(v) => set("mobile", v)} placeholder="+91 9876543210" />
                <Field label="Alternate Mobile" value={f.alt_mobile} onChange={(v) => set("alt_mobile", v)} />
                <Field label="Email *" testid="reg-email" type="email" value={f.email} onChange={(v) => set("email", v)} />
                <Field label="Pincode" value={f.pincode} onChange={(v) => set("pincode", v)} />
                <Field label="Address" as="textarea" value={f.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
                <Field label="City" value={f.city} onChange={(v) => set("city", v)} />
                <Field label="State" value={f.state} onChange={(v) => set("state", v)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <SectionTitle>Professional Details</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Role Applying For *" as="select" testid="reg-role"
                  options={ROLE_OPTIONS.map(o => o.v)}
                  optionLabels={Object.fromEntries(ROLE_OPTIONS.map(o => [o.v, o.l]))}
                  value={f.role} onChange={(v) => set("role", v)} />
                <Field label="Department" value={f.department} onChange={(v) => set("department", v)} />
                <Field label="Territory" value={f.territory} onChange={(v) => set("territory", v)} placeholder="e.g. South India" />
                <Field label="Working Area / Pincode" value={f.working_area} onChange={(v) => set("working_area", v)} />
                <Field label="Languages (comma separated)" value={f.languages} onChange={(v) => set("languages", v)} placeholder="English, Hindi, Telugu" className="sm:col-span-2" />
                <Field label="Previous Experience" as="textarea" value={f.previous_experience} onChange={(v) => set("previous_experience", v)} className="sm:col-span-2" />
                <Field label="LinkedIn Profile" value={f.linkedin} onChange={(v) => set("linkedin", v)} className="sm:col-span-2" />
                <FileField label="Resume (PDF/DOC)" accept=".pdf,.doc,.docx,application/pdf" file={f.resume} onChange={(file) => set("resume", file)} />
                <FileField label="PAN Card (image)" accept="image/*" file={f.pan_doc} onChange={(file) => set("pan_doc", file)} />
                <FileField label="Aadhaar Card (image)" accept="image/*" file={f.aadhaar_doc} onChange={(file) => set("aadhaar_doc", file)} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <div className="space-y-5">
                <SectionTitle>Bank Details</SectionTitle>
                <p className="text-[11px] text-zinc-500">Used for commission payouts. Encrypted at rest.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Account Holder Name" value={f.account_holder} onChange={(v) => set("account_holder", v)} />
                  <Field label="Bank Name" value={f.bank_name} onChange={(v) => set("bank_name", v)} />
                  <Field label="Account Number" value={f.account_number} onChange={(v) => set("account_number", v)} />
                  <Field label="IFSC" value={f.ifsc} onChange={(v) => set("ifsc", v.toUpperCase())} />
                  <Field label="UPI ID (for smaller payouts)" value={f.upi_id} onChange={(v) => set("upi_id", v)} className="sm:col-span-2" />
                </div>
              </div>
              <div className="space-y-5 border-t border-zinc-200 pt-6">
                <SectionTitle icon={HeartPulse}>Emergency Contact</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Name" value={f.emergency_name} onChange={(v) => set("emergency_name", v)} />
                  <Field label="Phone" value={f.emergency_phone} onChange={(v) => set("emergency_phone", v)} />
                  <Field label="Relation" value={f.emergency_relation} onChange={(v) => set("emergency_relation", v)} />
                </div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-8 pt-6 border-t border-zinc-200 flex items-center justify-between">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
            >← Back</button>
            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                data-testid="reg-next"
                className="bg-[#002FA7] hover:bg-[#002277] text-white px-6 py-2.5 text-sm flex items-center gap-2"
              >Continue <ArrowRight size={14} /></button>
            ) : (
              <button
                onClick={submit}
                disabled={busy}
                data-testid="reg-submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {busy ? "Submitting…" : (<>Submit application <CheckCircle2 size={14} /></>)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} className="text-[#002FA7]" />}
      <p className="overline">{children}</p>
    </div>
  );
}

function Field({ label, value, onChange, as, type = "text", options, optionLabels, placeholder, className = "", testid }) {
  const commonCls = "mt-2 w-full border border-zinc-300 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7]/20 px-3 py-2 text-sm outline-none";
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>
      {as === "textarea" ? (
        <textarea rows={2} data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={commonCls + " resize-y"} />
      ) : as === "select" ? (
        <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={commonCls + " bg-white"}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{optionLabels?.[opt] || opt || "— Select —"}</option>
          ))}
        </select>
      ) : (
        <input data-testid={testid} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={commonCls} />
      )}
    </div>
  );
}

function FileField({ label, accept, file, onChange, icon: Icon }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</label>
      <label className="mt-2 flex items-center gap-2 px-3 py-2 border border-zinc-300 hover:border-[#002FA7] text-sm cursor-pointer">
        {Icon ? <Icon size={14} className="text-zinc-500" /> : <Upload size={14} className="text-zinc-500" />}
        <span className="flex-1 truncate text-zinc-600">{file ? file.name : "Choose file…"}</span>
        <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
      <p className="text-[10px] text-zinc-400 mt-1">Max 8 MB</p>
    </div>
  );
}
