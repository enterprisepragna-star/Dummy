import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { imageUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LogOut, TrendingUp, Users, ShoppingBag, Coins, Award, Bell, User2, Copy } from "lucide-react";

export default function PartnerDashboardPage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [d, m] = await Promise.all([
          api.get("/partner/dashboard"),
          api.get("/partner/me"),
        ]);
        setData(d.data); setMe(m.data);
      } catch { toast.error("Could not load dashboard"); }
    })();
  }, []);

  const onLogout = async () => { await logout(); nav("/login"); };
  const copy = (v) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  if (!data || !me) return <div className="p-10 text-sm text-zinc-500">Loading…</div>;
  const p = me.partner || {};
  const t = data.totals;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {p.photo ? (
              <img src={imageUrl(p.photo)} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center"><User2 size={16} className="text-zinc-400" /></div>
            )}
            <div>
              <p className="font-display text-lg leading-tight">{p.full_name || me.user.name || me.user.email}</p>
              <p className="text-[11px] text-zinc-500">{me.role_label} · <span className="font-mono">{p.employee_id || "-"}</span></p>
            </div>
          </div>
          <button onClick={onLogout} data-testid="partner-logout" className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="overline">Partner Portal</p>
        <h1 className="font-display text-4xl sm:text-5xl font-light mt-1 tracking-tight">Welcome, {(p.full_name || "").split(" ")[0]}</h1>

        {/* KPI grid */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="Total Leads" value={t.total_leads} icon={Users} />
          <Kpi label="Closed Leads" value={t.closed_leads} icon={TrendingUp} />
          <Kpi label="Sales — Month" value={t.sales_month} icon={ShoppingBag} money />
          <Kpi label="Sales — Year" value={t.sales_year} icon={ShoppingBag} money />
          <Kpi label="Commission Earned" value={t.commission_earned} icon={Coins} money />
          <Kpi label="Commission Pending" value={t.commission_pending} icon={Coins} money />
          <Kpi label="Monthly Target" value={t.monthly_target} icon={Award} money />
          <Kpi label="Leaderboard Rank" value={data.leaderboard_rank || "—"} icon={Award} />
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Codes */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 p-5">
            <p className="overline text-[10px]">Your codes</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CodeCell label="Employee ID" value={p.employee_id} copy={copy} />
              <CodeCell label="Partner Code" value={p.partner_code} copy={copy} />
              <CodeCell label="Referral Code" value={p.referral_code} copy={copy} accent />
            </div>
            <p className="text-[11px] text-zinc-500 mt-4">
              Share your <b>referral code</b> with new leads — orders coming through it get you referral commission automatically once we launch the commission engine.
            </p>
          </div>

          {/* Notifications */}
          <div className="bg-white border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-3"><Bell size={13} className="text-[#002FA7]" /><p className="overline text-[10px]">Notifications</p></div>
            {(data.notifications || []).length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing new.</p>
            ) : (
              <ul className="space-y-3">
                {data.notifications.map((n, i) => (
                  <li key={i} className="border-l-2 border-[#002FA7] pl-3">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Coming soon strip */}
        <div className="mt-8 border border-dashed border-zinc-300 p-6 text-center">
          <p className="overline text-[10px]">Coming soon</p>
          <p className="font-display text-lg mt-2">Lead Management · Sales Entry · Commission Statements · Performance Graphs</p>
          <p className="text-[11px] text-zinc-500 mt-2 max-w-lg mx-auto">These modules are on the roadmap. Your dashboard cards above will start filling with real data as each module goes live.</p>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, money }) {
  const display = money ? `₹ ${Number(value || 0).toLocaleString("en-IN")}` : String(value || 0);
  return (
    <div className="bg-white border border-zinc-200 p-4">
      <div className="flex items-center gap-2 text-zinc-500"><Icon size={12} /><p className="overline text-[10px]">{label}</p></div>
      <p className="font-display text-2xl font-medium mt-2">{display}</p>
    </div>
  );
}

function CodeCell({ label, value, copy, accent }) {
  return (
    <div className={`border p-3 ${accent ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-base break-all">{value || "—"}</span>
        {value && <button onClick={() => copy(value)} className="text-zinc-400 hover:text-zinc-900"><Copy size={12} /></button>}
      </div>
    </div>
  );
}
