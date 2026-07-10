import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Handshake, ArrowRight, Building2, Mail, Phone, User2, ClipboardList, CheckCircle2, ShoppingBag } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ReferralLandingPage() {
  const { code } = useParams();
  const nav = useNavigate();

  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState(null); // { valid, referral_code, partner_first_name, role_label }
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    requirement: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!code) return;
    // Stash the referral tag for downstream flows (catalog, quotation view etc.)
    try { localStorage.setItem("oncost_ref", code.toUpperCase()); } catch { /* ignore */ }
    (async () => {
      try {
        const { data } = await api.get(`/refer/${encodeURIComponent(code)}`);
        setInfo(data);
      } catch (e) {
        setError(e.response?.data?.detail || "This referral link is not active.");
      } finally {
        setChecking(false);
      }
    })();
  }, [code]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please share your name so we know who to reach out to");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/refer/${encodeURIComponent(code)}/lead`, form);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const browseCatalog = () => {
    // Carry the tag on the query string so the catalog can persist it too.
    nav(`/catalog?ref=${encodeURIComponent(code.toUpperCase())}`);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <div className="animate-pulse text-sm text-zinc-400">Verifying your invitation…</div>
      </div>
    );
  }

  if (error || !info?.valid) {
    return (
      <div className="min-h-screen bg-white grid place-items-center px-6">
        <div className="max-w-md text-center">
          <p className="overline text-red-600">Link problem</p>
          <h1 className="font-display text-4xl font-medium mt-3 tracking-tight">
            This invitation isn&apos;t active.
          </h1>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            {error || "The referral link may have expired or the partner is no longer with ONCOST."}
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 bg-[#002FA7] hover:bg-[#002277] text-white px-4 py-2.5 text-sm"
          >
            Browse the catalog anyway <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const first = info.partner_first_name || "your ONCOST partner";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[#09090B] text-white relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-20" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-24 grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3">
            <p className="overline text-white/70">Personal invitation</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light mt-4 leading-[1.05] tracking-tight">
              {first} invited you to
              <br />
              <span className="text-[#F5C518]">ONCOST</span>.
            </h1>
            <p className="mt-6 text-white/70 text-base max-w-lg leading-relaxed">
              Premium corporate gift sets, cast in brass and packaged for impact. Share a few
              details — {first} will personally curate options for your requirement, or explore
              the full digital catalog first.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#capture"
                data-testid="refer-cta-form"
                className="inline-flex items-center gap-2 bg-white text-[#09090B] hover:bg-white/90 px-5 py-3 text-sm font-medium"
              >
                <Handshake size={14} /> Get a personal quote
              </a>
              <button
                data-testid="refer-cta-catalog"
                onClick={browseCatalog}
                className="inline-flex items-center gap-2 border border-white/25 hover:border-white/70 px-5 py-3 text-sm"
              >
                <ShoppingBag size={14} /> Browse catalog first
              </button>
            </div>
            <p className="mt-6 text-[11px] text-white/40">
              Referral code{" "}
              <span className="font-mono text-white/70">{info.referral_code}</span>
              {" · "}Invited by {info.role_label}
            </p>
          </div>
          <div className="lg:col-span-2 hidden lg:flex flex-col justify-end">
            <div className="border border-white/10 p-6 bg-white/[0.03] backdrop-blur">
              <p className="overline text-white/60">What happens next</p>
              <ol className="mt-4 space-y-3 text-sm text-white/80">
                <li className="flex gap-3"><span className="font-mono text-white/40">01</span>Tell us what you&apos;re gifting and when.</li>
                <li className="flex gap-3"><span className="font-mono text-white/40">02</span>{first} receives your enquiry instantly.</li>
                <li className="flex gap-3"><span className="font-mono text-white/40">03</span>You get a curated shortlist + quote within 24 hrs.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Capture form */}
      <section id="capture" className="max-w-3xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
        {done ? (
          <div data-testid="refer-done" className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="text-emerald-600" />
            </div>
            <p className="overline mt-6 text-emerald-700">Enquiry sent</p>
            <h2 className="font-display text-4xl font-medium mt-3 tracking-tight">
              Thank you.
            </h2>
            <p className="text-zinc-500 text-sm mt-3 leading-relaxed max-w-md mx-auto">
              We&apos;ve notified {first} and our team. Expect a curated shortlist and a
              formal quote within 24 hours.
            </p>
            <div className="mt-8 flex gap-3 justify-center">
              <button
                onClick={browseCatalog}
                data-testid="refer-after-catalog"
                className="inline-flex items-center gap-2 bg-[#002FA7] hover:bg-[#002277] text-white px-5 py-3 text-sm"
              >
                <ShoppingBag size={14} /> Browse the catalog
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} data-testid="refer-form">
            <p className="overline">Enquiry</p>
            <h2 className="font-display text-4xl font-medium mt-2 tracking-tight">
              A few details.
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              Everything below goes straight to {first} — never spam, never lists.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Your name *" icon={User2}>
                <input
                  data-testid="refer-input-name"
                  required
                  value={form.name}
                  onChange={set("name")}
                  className={inputCls}
                  placeholder="Anita Desai"
                />
              </Field>
              <Field label="Company" icon={Building2}>
                <input
                  data-testid="refer-input-company"
                  value={form.company}
                  onChange={set("company")}
                  className={inputCls}
                  placeholder="Acme Pvt Ltd"
                />
              </Field>
              <Field label="Email" icon={Mail}>
                <input
                  data-testid="refer-input-email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  className={inputCls}
                  placeholder="you@company.com"
                />
              </Field>
              <Field label="Phone / WhatsApp" icon={Phone}>
                <input
                  data-testid="refer-input-phone"
                  value={form.phone}
                  onChange={set("phone")}
                  className={inputCls}
                  placeholder="+91 98xxx xxxxx"
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="What are you gifting? (occasion, quantity, budget)" icon={ClipboardList}>
                <textarea
                  data-testid="refer-input-requirement"
                  rows={4}
                  value={form.requirement}
                  onChange={set("requirement")}
                  className={`${inputCls} resize-none pt-2.5`}
                  placeholder="Diwali gifting for 120 employees, budget ~₹1500/piece, need branded packaging"
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                data-testid="refer-submit"
                disabled={busy}
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-[#002FA7] hover:bg-[#002277] text-white px-6 py-3 text-sm font-medium disabled:opacity-50"
              >
                {busy ? "Sending…" : (<>Send my enquiry <ArrowRight size={14} /></>)}
              </button>
              <button
                type="button"
                onClick={browseCatalog}
                className="inline-flex items-center justify-center gap-2 border border-zinc-300 hover:border-zinc-900 px-6 py-3 text-sm"
              >
                Or browse the catalog first
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 mt-6 leading-relaxed">
              By submitting you agree to be contacted by ONCOST about your enquiry. Your
              details are shared only with {first} and our internal team — never with third parties.
            </p>
          </form>
        )}
      </section>

      <footer className="border-t border-zinc-200 py-6 text-center text-[11px] text-zinc-400">
        ONCOST · Pragna Enterprises · Hyderabad, Telangana
      </footer>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 pl-9 border border-zinc-300 focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20 text-sm outline-none transition-all bg-white";

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="overline text-[10px]">{label}</label>
      <div className="mt-2 relative">
        {Icon && (
          <Icon
            size={14}
            className="absolute left-3 top-3 text-zinc-400 pointer-events-none"
          />
        )}
        {children}
      </div>
    </div>
  );
}
