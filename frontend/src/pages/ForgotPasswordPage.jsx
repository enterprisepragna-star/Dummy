import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post("/auth/forgot-password", { identifier });
      setSent(true);
    } catch (e) {
      setErr(
        e.response?.data?.detail ||
          e.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#09090B] text-white p-12 relative">
        <div className="grid-bg absolute inset-0 opacity-20" />
        <div className="relative z-10">
          <p className="overline text-white/70">Account recovery</p>
          <h1 className="font-display text-6xl font-light mt-3 leading-tight">
            Forgot
            <br />
            your password?
          </h1>
          <p className="mt-4 text-white/70 text-sm max-w-xs">
            No worries. Enter the email you registered with (or your Employee ID) and we&apos;ll send a
            secure reset link — valid for 24 hours.
          </p>
        </div>
        <div className="relative z-10">
          <p className="tag-strip text-white/50">ONCOST • Bengaluru • India</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <Link
            to="/login"
            data-testid="fp-back-login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#002FA7]"
          >
            <ArrowLeft size={12} /> Back to sign in
          </Link>

          {sent ? (
            <div className="mt-6" data-testid="fp-sent">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={18} />
                <p className="overline text-emerald-700">Check your inbox</p>
              </div>
              <h2 className="font-display text-3xl font-medium mt-3 tracking-tight">
                Reset link sent.
              </h2>
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                If an account exists for
                <span className="font-mono text-zinc-800"> {identifier} </span>
                we&apos;ve emailed a reset link. It will expire in 24 hours.
              </p>
              <p className="text-[11px] text-zinc-400 mt-4 leading-relaxed">
                Didn&apos;t receive it? Check spam, or request another link after a couple of minutes.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  data-testid="fp-send-again"
                  onClick={() => {
                    setSent(false);
                    setErr("");
                  }}
                  className="text-xs text-[#002FA7] underline"
                >
                  Send to a different address
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6">
              <p className="overline">Password recovery</p>
              <h2 className="font-display text-4xl font-medium mt-2 tracking-tight">
                Reset password.
              </h2>
              <p className="text-zinc-500 text-sm mt-2">
                We&apos;ll email a secure link to the account owner.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="overline text-[10px]">Email or Employee ID</label>
                  <div className="mt-2 relative">
                    <Mail
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      data-testid="fp-identifier"
                      required
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border border-zinc-300 focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20 text-sm outline-none transition-all"
                      placeholder="you@company.com  or  ONCOST-EMP-0001"
                    />
                  </div>
                </div>

                {err && (
                  <div className="border border-red-200 bg-red-50 text-red-700 text-xs p-3">
                    {err}
                  </div>
                )}

                <button
                  data-testid="fp-submit"
                  disabled={busy}
                  type="submit"
                  className="w-full bg-[#002FA7] hover:bg-[#002277] text-white py-3 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {busy ? "Sending link…" : "Email me a reset link"}
                </button>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  For your security, we always show the same confirmation, whether or not the account exists.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
