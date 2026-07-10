import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

function InvalidPanel({ title, subtitle }) {
  return (
    <div data-testid="rp-invalid" className="mt-6">
      <p className="overline text-red-600">Link problem</p>
      <h2 className="font-display text-3xl font-medium mt-3 tracking-tight">{title}</h2>
      <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{subtitle}</p>
      <Link
        to="/forgot-password"
        className="mt-6 inline-flex items-center gap-2 bg-[#002FA7] hover:bg-[#002277] text-white px-4 py-2.5 text-sm"
      >
        Request a new link <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [tokenState, setTokenState] = useState({ valid: false, reason: "", email: "" });

  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setChecking(false);
        setTokenState({ valid: false, reason: "missing", email: "" });
        return;
      }
      try {
        const { data } = await api.get(`/auth/reset-password/verify`, {
          params: { token },
        });
        if (!cancelled) setTokenState({ valid: !!data.valid, reason: data.reason || "", email: data.email || "" });
      } catch (e) {
        if (!cancelled) setTokenState({ valid: false, reason: "network", email: "" });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPw) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      toast.success("Password updated. Please sign in.");
      setTimeout(() => nav("/login"), 1400);
    } catch (e) {
      setErr(
        e.response?.data?.detail ||
          e.message ||
          "Could not reset password. Please try again.",
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
          <p className="overline text-white/70">Secure reset</p>
          <h1 className="font-display text-6xl font-light mt-3 leading-tight">
            Choose a
            <br />
            new password.
          </h1>
          <p className="mt-4 text-white/70 text-sm max-w-xs">
            Use at least 8 characters. Mix letters, numbers and a symbol to keep your ONCOST
            account safe.
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
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#002FA7]"
          >
            <ArrowLeft size={12} /> Back to sign in
          </Link>

          {checking && (
            <div className="mt-8">
              <div className="h-5 w-32 bg-zinc-100 animate-pulse" />
              <div className="mt-3 h-10 w-64 bg-zinc-100 animate-pulse" />
              <div className="mt-6 h-24 w-full bg-zinc-50 animate-pulse" />
            </div>
          )}

          {!checking && !tokenState.valid && tokenState.reason === "expired" && (
            <InvalidPanel
              title="This link has expired."
              subtitle="Reset links are valid for 24 hours. Request a new one and we'll email you a fresh link."
            />
          )}

          {!checking && !tokenState.valid && tokenState.reason !== "expired" && (
            <InvalidPanel
              title="This reset link isn't valid."
              subtitle="It may have already been used, or the URL wasn't copied fully. Please request a new link."
            />
          )}

          {!checking && tokenState.valid && !done && (
            <form onSubmit={onSubmit} className="mt-6" data-testid="rp-form">
              <p className="overline">Choose new password</p>
              <h2 className="font-display text-4xl font-medium mt-2 tracking-tight">
                Set a new password.
              </h2>
              {tokenState.email && (
                <p className="text-zinc-500 text-sm mt-2">
                  For account{" "}
                  <span className="font-mono text-zinc-800">{tokenState.email}</span>
                </p>
              )}

              <div className="mt-8 space-y-4">
                <div>
                  <label className="overline text-[10px]">New password</label>
                  <div className="mt-2 relative">
                    <Lock
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      data-testid="rp-password"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border border-zinc-300 focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20 text-sm outline-none transition-all"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>
                <div>
                  <label className="overline text-[10px]">Confirm password</label>
                  <div className="mt-2 relative">
                    <ShieldCheck
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      data-testid="rp-confirm"
                      required
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border border-zinc-300 focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20 text-sm outline-none transition-all"
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                {err && (
                  <div className="border border-red-200 bg-red-50 text-red-700 text-xs p-3">
                    {err}
                  </div>
                )}

                <button
                  data-testid="rp-submit"
                  disabled={busy}
                  type="submit"
                  className="w-full bg-[#002FA7] hover:bg-[#002277] text-white py-3 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {busy ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          )}

          {done && (
            <div className="mt-8" data-testid="rp-done">
              <p className="overline text-emerald-700">All set</p>
              <h2 className="font-display text-3xl font-medium mt-3 tracking-tight">
                Password updated.
              </h2>
              <p className="text-zinc-500 text-sm mt-2">Taking you to sign-in…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
