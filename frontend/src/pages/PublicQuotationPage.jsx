import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { API, imageUrl, formatINR } from "@/lib/api";
import { PUBLIC } from "@/constants/testIds";
import { Printer, FileDown, Calendar, MapPin, User2, Hash, Mail, ZoomIn } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";

export default function PublicQuotationPage() {
  const { token } = useParams();
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    api.get(`/share/${token}`).then(({ data }) => setQ(data)).catch((e) => {
      setErr(e.response?.data?.detail || "Quotation not available");
    });
  }, [token]);

  if (err) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
      <div className="border border-zinc-200 bg-white p-10 max-w-md text-center">
        <p className="overline">404</p>
        <h1 className="font-display text-3xl mt-2">Quotation not available</h1>
        <p className="text-sm text-zinc-500 mt-3">This link may have been disabled or revoked by the sender.</p>
      </div>
    </div>
  );
  if (!q) return <div className="p-10 text-sm text-zinc-500">Loading…</div>;

  const createdStr = q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const pdfUrl = `${API}/share/${token}/pdf`;

  return (
    <div data-testid={PUBLIC.quotationContainer} className="min-h-screen bg-zinc-50">
      {/* Sticky toolbar */}
      <div className="no-print sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="logo-mark text-xl">ONCOST</span>
            <span className="overline text-[10px]">quotation</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} data-testid={PUBLIC.printBtn} className="border border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7] px-3 py-1.5 text-xs flex items-center gap-2"><Printer size={12} /> Print</button>
            <a href={pdfUrl} target="_blank" rel="noreferrer" data-testid={PUBLIC.downloadPdfBtn} className="bg-[#002FA7] hover:bg-[#002277] text-white px-3 py-1.5 text-xs flex items-center gap-2"><FileDown size={12} /> Download PDF</a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 print-container">
        {/* Header */}
        <div className="border-b border-zinc-900 pb-8 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="overline">ONCOST</p>
            <h1 className="font-display text-5xl md:text-6xl font-light tracking-tight mt-2">Quotation</h1>
            <p className="font-mono text-sm text-zinc-500 mt-3">{q.quotation_id}</p>
          </div>
          <div className="text-right">
            <p className="overline text-[10px]">Prepared for</p>
            <p className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-1">{q.customer_name}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 border-t-0 mb-12">
          <Meta icon={Hash} label="Quotation ID" value={q.quotation_id} mono />
          <Meta icon={MapPin} label="Place" value={q.place || "—"} />
          <Meta icon={Calendar} label="Date" value={createdStr} />
          <Meta icon={Calendar} label="Valid until" value={q.valid_until || "—"} />
        </div>

        {/* Items grid */}
        <p className="overline mb-6">Line items</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {q.items.map((it, i) => (
            <div key={`${it.product_id || it.code}-${i}`} className="bg-white border border-zinc-200 print-block flex flex-col">
              {it.image && (
                <button
                  type="button"
                  onClick={() => setZoom({ src: imageUrl(it.image), alt: it.code, caption: `${it.code} · ${it.set_type || ""}` })}
                  className="relative block w-full aspect-[4/3] overflow-hidden bg-white border-b border-zinc-200 cursor-zoom-in group/img print:cursor-default"
                  data-testid={`quote-item-image-${it.code}`}
                  aria-label={`Enlarge image of ${it.code}`}
                >
                  <img src={imageUrl(it.image)} alt={it.code} className="w-full h-full object-contain p-3" />
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] uppercase tracking-wider font-mono px-2 py-1 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity print:hidden">
                    <ZoomIn size={11} /> Click to enlarge
                  </span>
                </button>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] font-bold tracking-wider">{it.code}</p>
                  <p className="overline text-[10px]">MOQ {it.moq}</p>
                </div>
                <p className="font-display text-lg font-medium mt-2">{it.set_type}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-3">{it.items}</p>
                <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between gap-2">
                  <div>
                    <p className="overline text-[9px]">Unit × Qty</p>
                    <p className="font-mono text-sm">{formatINR(it.unit_price)} × {it.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="overline text-[9px]">Line total</p>
                    <p className="font-display text-lg font-medium">{formatINR(it.line_total)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-12 border-t-2 border-zinc-900 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="overline">Summary</p>
              <p className="text-xs text-zinc-500 mt-1">{q.items.length} line item(s) • prices in INR (₹)</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span className="font-mono">{formatINR(q.subtotal ?? q.total)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Shipping</span><span className="font-mono">{formatINR(q.shipping_charges || 0)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">GST ({q.gst_percent || 0}%)</span><span className="font-mono">{formatINR(q.gst_amount || 0)}</span></div>
              <div className="pt-3 mt-2 border-t border-zinc-900 flex items-baseline justify-between">
                <span className="overline">Grand total</span>
                <span className="font-display text-3xl md:text-4xl font-light tracking-tight">{formatINR(q.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {q.notes && (
          <div className="mt-10 border border-zinc-200 p-5">
            <p className="overline text-[10px]">Notes</p>
            <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line">{q.notes}</p>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-zinc-500">
          <div>
            <p className="overline text-[10px] text-zinc-900">From</p>
            <p className="mt-2 font-display text-lg text-zinc-900">ONCOST</p>
            <p>Corporate gifting solutions</p>
          </div>
          <div>
            <p className="overline text-[10px] text-zinc-900">Terms</p>
            <p className="mt-2 leading-relaxed">Prices are exclusive of taxes & freight unless mentioned. Quote is valid until the date above, subject to stock.</p>
          </div>
          <div>
            <p className="overline text-[10px] text-zinc-900">Reference</p>
            <p className="mt-2 font-mono">{q.quotation_id}</p>
            <p className="mt-1">Issued {createdStr}</p>
          </div>
        </div>
        <p className="text-center text-[11px] text-zinc-400 mt-10 font-mono">© ONCOST {new Date().getFullYear()} — Quotation for {q.customer_name}</p>
      </div>
      {zoom && <ImageLightbox {...zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

const Meta = ({ icon: Icon, label, value, mono }) => (
  <div className="bg-white p-4">
    <p className="overline text-[10px] flex items-center gap-1"><Icon size={10} /> {label}</p>
    <p className={`mt-2 ${mono ? "font-mono" : "font-display"} text-base`}>{value}</p>
  </div>
);
