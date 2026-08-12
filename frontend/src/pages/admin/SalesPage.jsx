import React, { useEffect, useState } from "react";
import api, { formatINR } from "@/lib/api";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/sales").then(({ data }) => setSales(data)).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="overline">Sales</p>
      <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Accepted Sales</h1>
      <p className="text-sm text-zinc-500 mt-2">Quotations marked as accepted become sales here. Total accepted: <b>{sales.length}</b>.</p>

      {loading ? <p className="mt-6 text-sm text-zinc-500">Loading…</p> : sales.length === 0 ? (
        <div className="mt-8 border border-zinc-200 p-10 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
          <p className="font-display text-xl text-zinc-700 mt-3">No sales yet</p>
          <p className="text-sm text-zinc-500 mt-2">When you accept a quotation, it will move here as a sale.</p>
        </div>
      ) : (
        <div className="mt-6 border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-900">
                <th className="p-3 overline">Quotation</th>
                <th className="p-3 overline">Customer</th>
                <th className="p-3 overline">Note / Approval</th>
                <th className="p-3 overline text-right">Budget</th>
                <th className="p-3 overline text-right">Total</th>
                <th className="p-3 overline">Accepted</th>
              </tr>
            </thead>
           <tbody>
  {(Array.isArray(sales) ? sales : []).map((s) => (
    <tr
      key={s.id}
      data-testid={`sale-row-${s.id}`}
      className="border-b border-zinc-200 hover:bg-zinc-50 align-top"
    >
      <td className="p-3 font-mono font-semibold">
        <Link
          className="hover:text-[#002FA7]"
          to={`/admin/quotations/${s.quotation_ref}`}
        >
          {s.quotation_id}
        </Link>
      </td>

      <td className="p-3">
        <div>{s.customer_name}</div>
        <div className="text-xs text-zinc-500">
          {s.customer_company || ""}
        </div>
      </td>

      <td className="p-3 text-xs text-zinc-700 whitespace-pre-line max-w-md">
        {s.note || "-"}
      </td>

      <td className="p-3 text-right font-mono">
        {s.approved_budget != null ? formatINR(s.approved_budget) : "-"}
      </td>

      <td className="p-3 text-right font-mono font-semibold">
        {formatINR(s.total)}
      </td>

      <td className="p-3 text-xs text-zinc-500">
        {(s.accepted_at || "").slice(0, 10)}
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
