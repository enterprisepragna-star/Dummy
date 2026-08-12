import React, { useEffect, useState } from "react";
import api, { formatINR, shareLink } from "@/lib/api";
import { Link } from "react-router-dom";
import { ADMIN } from "@/constants/testIds";
import { toast } from "sonner";
import { Copy, Power, Trash2, FileDown, ExternalLink } from "lucide-react";

export default function QuotationsListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/quotations");
      setList(data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    try {
      const { data } = await api.patch(`/quotations/${id}/toggle`);
      setList(prev => prev.map(q => q.id === id ? { ...q, active: data.active } : q));
      toast.success(data.active ? "Link enabled" : "Link disabled");
    } catch { toast.error("Failed"); }
  };

  const del = async (id) => {
    if (!confirm("Delete this quotation?")) return;
    try { await api.delete(`/quotations/${id}`); setList(prev => prev.filter(q => q.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  const copyLink = async (token) => {
    try { await navigator.clipboard.writeText(shareLink(token)); toast.success("Link copied"); } catch { toast.error("Could not copy"); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="overline">Sales</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Quotations</h1>
          <p className="text-sm text-zinc-500 mt-2">{list.length} quotation(s). Toggle public link or download PDF.</p>
        </div>
        <Link to="/admin/quotations/new" className="bg-[#002FA7] text-white px-5 py-2 text-sm hover:bg-[#002277]">+ New Quotation</Link>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : list.length === 0 ? (
        <div className="border border-zinc-200 p-10 text-center">
          <p className="font-display text-xl text-zinc-700">No quotations yet</p>
          <p className="text-sm text-zinc-500 mt-2">Create your first quotation to share with customers.</p>
        </div>
      ) : (
        <div className="border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-900">
                <th className="p-3 overline">Quotation ID</th>
                <th className="p-3 overline">Customer</th>
                <th className="p-3 overline">Place</th>
                <th className="p-3 overline text-right">Items</th>
                <th className="p-3 overline text-right">Total</th>
                <th className="p-3 overline">Status</th>
                <th className="p-3 overline">Created</th>
                <th className="p-3 overline text-right">Actions</th>
              </tr>
            </thead>
           <tbody>
  {(Array.isArray(list) ? list : []).map(q => (
                <tr key={q.id} data-testid={ADMIN.quoteRow(q.id)} className="border-b border-zinc-200 hover:bg-zinc-50">
                  <td className="p-3 font-mono font-semibold text-[13px]">
                    <Link to={`/admin/quotations/${q.id}`} className="hover:text-[#002FA7]">{q.quotation_id}</Link>
                  </td>
                  <td className="p-3">{q.customer_name}</td>
                  <td className="p-3 text-zinc-500">{q.place || "—"}</td>
                  <td className="p-3 text-right font-mono">{q.items.length}</td>
                  <td className="p-3 text-right font-mono font-semibold">{formatINR(q.total)}</td>
                  <td className="p-3">
                    <span className={`inline-block w-2 h-2 mr-2 ${q.active ? "bg-emerald-500" : "bg-zinc-300"}`}></span>
                    <span className="text-xs">{q.active ? "Active" : "Disabled"}</span>
                  </td>
                  <td className="p-3 text-xs text-zinc-500">{(q.created_at || "").slice(0,10)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <a href={`/q/${q.share_token}`} target="_blank" rel="noreferrer" className="p-1 hover:bg-zinc-100" title="Open public link"><ExternalLink size={14} /></a>
                      <button data-testid={ADMIN.quoteCopyLink(q.id)} onClick={() => copyLink(q.share_token)} className="p-1 hover:bg-zinc-100" title="Copy share link"><Copy size={14} /></button>
                      <a data-testid={ADMIN.quoteDownloadPdf(q.id)} href={`${process.env.REACT_APP_BACKEND_URL}/api/share/${q.share_token}/pdf`} target="_blank" rel="noreferrer" className="p-1 hover:bg-zinc-100" title="Download PDF"><FileDown size={14} /></a>
                      <button data-testid={ADMIN.quoteToggle(q.id)} onClick={() => toggle(q.id)} className="p-1 hover:bg-zinc-100" title={q.active ? "Disable link" : "Enable link"}><Power size={14} className={q.active ? "text-emerald-600" : "text-zinc-400"} /></button>
                      <button data-testid={ADMIN.quoteDelete(q.id)} onClick={() => del(q.id)} className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
