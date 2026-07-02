import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { imageUrl, formatINR, shareLink } from "@/lib/api";
import { ADMIN } from "@/constants/testIds";
import { toast } from "sonner";
import { Copy, FileDown, Power, ExternalLink, ArrowLeft, MessageCircle, Mail, CheckCircle2 } from "lucide-react";

export default function QuotationDetailPage() {
  const { id } = useParams();
  const [q, setQ] = useState(null);

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptNote, setAcceptNote] = useState("");
  const [acceptBudget, setAcceptBudget] = useState("");
  const [acceptBusy, setAcceptBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/quotations/${id}`);
    setQ(data);
  };
  useEffect(() => { load(); }, [id]);

  if (!q) return <p className="text-sm text-zinc-500">Loading…</p>;

  const toggle = async () => {
    const { data } = await api.patch(`/quotations/${q.id}/toggle`);
    setQ({ ...q, active: data.active });
  };
  const submitAccept = async () => {
    if (!acceptNote.trim()) { toast.error("Note is required"); return; }
    setAcceptBusy(true);
    try {
      await api.post(`/quotations/${q.id}/accept`, {
        note: acceptNote.trim(),
        approved_budget: acceptBudget ? Number(acceptBudget) : null,
      });
      toast.success(`Quotation ${q.quotation_id} accepted → converted to sale`);
      setAcceptOpen(false);
      setAcceptNote("");
      setAcceptBudget("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not accept");
    } finally {
      setAcceptBusy(false);
    }
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink(q.share_token));
    toast.success("Share link copied");
  };

  const whatsappMessage = () => {
    const link = shareLink(q.share_token);
    const text = `Hi ${q.customer_name},\n\nHere's your ONCOST quotation *${q.quotation_id}* — total ${formatINR(q.total)}.\n\nView details: ${link}\n\n— Team ONCOST`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };
  const emailLink = () => {
    const link = shareLink(q.share_token);
    const subject = `ONCOST Quotation ${q.quotation_id} — ${q.customer_name}`;
    const body = `Hi ${q.customer_name},\n\nPlease find your ONCOST quotation ${q.quotation_id} below.\n\nGrand total: ${formatINR(q.total)}\nValid until: ${q.valid_until || "—"}\n\nView quotation: ${link}\n\nDownload PDF: ${process.env.REACT_APP_BACKEND_URL}/api/share/${q.share_token}/pdf\n\nRegards,\nONCOST`;
    const to = q.customer_email ? encodeURIComponent(q.customer_email) : "";
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div>
      <Link to="/admin/quotations" className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1"><ArrowLeft size={12} /> Back to quotations</Link>
      <div className="mt-3 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="overline">Quotation</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">{q.quotation_id}</h1>
          <p className="text-sm text-zinc-500 mt-2">For <span className="font-medium text-zinc-900">{q.customer_name}</span> • {q.place || "—"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button data-testid="quote-copy-link" onClick={copyLink} className="border border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7] px-3 py-2 text-sm flex items-center gap-2"><Copy size={14} /> Copy link</button>
          <a
            href={whatsappMessage()}
            target="_blank"
            rel="noreferrer"
            data-testid="quote-share-whatsapp"
            className="border border-[#25D366] text-[#128C7E] hover:bg-[#25D366] hover:text-white px-3 py-2 text-sm flex items-center gap-2 transition-all"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a
            href={emailLink()}
            data-testid="quote-share-email"
            className="border border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7] px-3 py-2 text-sm flex items-center gap-2"
          >
            <Mail size={14} /> Email
          </a>
          <a href={`${process.env.REACT_APP_BACKEND_URL}/api/share/${q.share_token}/pdf`} target="_blank" rel="noreferrer" className="border border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7] px-3 py-2 text-sm flex items-center gap-2"><FileDown size={14} /> PDF</a>
          <a href={`/q/${q.share_token}`} target="_blank" rel="noreferrer" className="border border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7] px-3 py-2 text-sm flex items-center gap-2"><ExternalLink size={14} /> Public view</a>
          <button onClick={toggle} className={`border px-3 py-2 text-sm flex items-center gap-2 ${q.active ? "border-emerald-600 text-emerald-600" : "border-zinc-300 text-zinc-500"}`}><Power size={14} /> {q.active ? "Active" : "Disabled"}</button>
          {q.status !== "accepted" ? (
            <button
              onClick={() => setAcceptOpen(true)}
              data-testid="quote-accept"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm flex items-center gap-2"
            >
              <CheckCircle2 size={14} /> Accept &amp; Convert to Sale
            </button>
          ) : (
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 text-sm flex items-center gap-2">
              <CheckCircle2 size={14} /> Accepted — sale recorded
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 border border-zinc-200 p-5 bg-zinc-50 grid grid-cols-2 md:grid-cols-5 gap-px text-sm">
        <div className="bg-white p-4">
          <p className="overline text-[10px]">Customer email</p>
          <p className="font-mono text-xs mt-2 break-all">{q.customer_email || "—"}</p>
        </div>
        <div className="bg-white p-4">
          <p className="overline text-[10px]">Share link</p>
          <p className="font-mono text-xs mt-2 break-all">{shareLink(q.share_token)}</p>
        </div>
        <div className="bg-white p-4">
          <p className="overline text-[10px]">Valid until</p>
          <p className="mt-2">{q.valid_until || "—"}</p>
        </div>
        <div className="bg-white p-4">
          <p className="overline text-[10px]">Items</p>
          <p className="mt-2 font-display text-xl">{q.items.length}</p>
        </div>
        <div className="bg-white p-4">
          <p className="overline text-[10px]">Grand total</p>
          <p className="mt-2 font-display text-xl font-medium">{formatINR(q.total)}</p>
        </div>
      </div>

      <div className="mt-8 border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-zinc-900">
              <th className="p-3 overline">Image</th>
              <th className="p-3 overline">Code</th>
              <th className="p-3 overline">Description</th>
              <th className="p-3 overline text-right">MOQ</th>
              <th className="p-3 overline text-right">Qty</th>
              <th className="p-3 overline text-right">Unit</th>
              <th className="p-3 overline text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((it, i) => (
              <tr key={`${it.product_id || it.code}-${i}`} className="border-b border-zinc-200">
                <td className="p-3 w-20">{it.image && <img src={imageUrl(it.image)} className="w-14 h-14 object-contain bg-white border border-zinc-200" />}</td>
                <td className="p-3 font-mono font-semibold">{it.code}</td>
                <td className="p-3"><span className="font-medium">{it.set_type}</span><div className="text-xs text-zinc-500">{it.items}</div></td>
                <td className="p-3 text-right font-mono">{it.moq}</td>
                <td className="p-3 text-right font-mono">{it.quantity}</td>
                <td className="p-3 text-right font-mono">{formatINR(it.unit_price)}</td>
                <td className="p-3 text-right font-mono font-semibold">{formatINR(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="p-3 text-right text-zinc-500">Subtotal (Products)</td>
              <td className="p-3 text-right font-mono">{formatINR(q.subtotal ?? q.total)}</td>
            </tr>
            {(q.packaging_charges || 0) > 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-right text-zinc-500">Packaging Charges</td>
                <td className="p-3 text-right font-mono">{formatINR(q.packaging_charges)}</td>
              </tr>
            )}
            {(q.branding_charges || 0) > 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-right text-zinc-500">Branding / Printing Charges</td>
                <td className="p-3 text-right font-mono">{formatINR(q.branding_charges)}</td>
              </tr>
            )}
            {(q.shipping_charges || 0) > 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-right text-zinc-500">Shipping Charges</td>
                <td className="p-3 text-right font-mono">{formatINR(q.shipping_charges)}</td>
              </tr>
            )}
            {(q.discount_amount || 0) > 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-right text-emerald-700">
                  Less: {q.discount_label || "Discount"}{q.discount_type === "percent" ? ` (${q.discount_value}%)` : ""}
                </td>
                <td className="p-3 text-right font-mono text-emerald-700">- {formatINR(q.discount_amount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={6} className="p-3 text-right text-zinc-500">GST ({q.gst_percent || 0}%)</td>
              <td className="p-3 text-right font-mono">{formatINR(q.gst_amount || 0)}</td>
            </tr>
            <tr className="border-t-2 border-zinc-900">
              <td colSpan={6} className="p-3 text-right overline">Grand total</td>
              <td className="p-3 text-right font-display text-xl font-medium">{formatINR(q.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <EditChargesPanel q={q} onSaved={load} />

      {q.notes && (
        <div className="mt-6 border border-zinc-200 p-4">
          <p className="overline text-[10px]">Notes</p>
          <p className="mt-2 text-sm text-zinc-700">{q.notes}</p>
        </div>
      )}

      {q.status === "accepted" && (
        <div className="mt-6 border-2 border-emerald-400 bg-emerald-50 p-5" data-testid="acceptance-block">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-700" />
            <p className="overline text-emerald-700">Accepted as sale</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3 text-sm">
            <div>
              <p className="overline text-[10px] text-emerald-700">Accepted on</p>
              <p className="mt-1 font-mono">{(q.accepted_at || "").slice(0, 10) || "—"}</p>
            </div>
            {q.approved_budget !== undefined && q.approved_budget !== null && (
              <div>
                <p className="overline text-[10px] text-emerald-700">Approved budget</p>
                <p className="mt-1 font-display text-lg">{formatINR(q.approved_budget)}</p>
              </div>
            )}
            <div className="md:col-span-1">
              <p className="overline text-[10px] text-emerald-700">Note / comments</p>
              <p className="mt-1 text-zinc-800 whitespace-pre-line">{q.acceptance_note || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Accept dialog */}
      {acceptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAcceptOpen(false)}>
          <div className="bg-white border border-zinc-200 shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200">
              <p className="overline text-[10px]">Accept &amp; convert to sale</p>
              <h3 className="font-display text-xl font-medium mt-1">{q.quotation_id} — {q.customer_name}</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="overline text-[10px]">Acceptance note / approval comments *</label>
                <textarea
                  data-testid="accept-note"
                  rows={4}
                  value={acceptNote}
                  onChange={(e) => setAcceptNote(e.target.value)}
                  placeholder="e.g. Approved by purchase head Mr. Rao via email on 21 Jun. Budget sanctioned."
                  className="mt-2 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-emerald-600 outline-none resize-y"
                />
              </div>
              <div>
                <label className="overline text-[10px]">Approved budget (₹) — optional</label>
                <input
                  data-testid="accept-budget"
                  type="number"
                  min={0}
                  value={acceptBudget}
                  onChange={(e) => setAcceptBudget(e.target.value)}
                  placeholder={`Quote total: ${formatINR(q.total)}`}
                  className="mt-2 w-full px-3 py-2 border border-zinc-300 font-mono text-sm focus:border-emerald-600 outline-none"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
                Once accepted, the public share link will be <b>closed</b> and the quotation will move to <b>Accepted Sales</b>.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
              <button onClick={() => setAcceptOpen(false)} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
              <button
                onClick={submitAccept}
                disabled={acceptBusy}
                data-testid="accept-submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> {acceptBusy ? "Accepting…" : "Confirm & convert to sale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Panel to edit charges, discount, T&C, inclusions on an existing quotation. */
function EditChargesPanel({ q, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    packaging_charges: q.packaging_charges || 0,
    branding_charges: q.branding_charges || 0,
    shipping_charges: q.shipping_charges || 0,
    gst_percent: q.gst_percent || 0,
    discount_type: q.discount_type || "",
    discount_value: q.discount_value || 0,
    discount_label: q.discount_label || "Discount",
    inclusions: q.inclusions || "",
    terms_and_conditions: q.terms_and_conditions || "",
    delivery_timeline: q.delivery_timeline || "",
    payment_terms: q.payment_terms || "",
  });
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        packaging_charges: Number(form.packaging_charges) || 0,
        branding_charges: Number(form.branding_charges) || 0,
        shipping_charges: Number(form.shipping_charges) || 0,
        gst_percent: Number(form.gst_percent) || 0,
        discount_type: form.discount_type || null,
        discount_value: Number(form.discount_value) || 0,
        discount_label: (form.discount_label || "Discount").trim(),
        inclusions: form.inclusions,
        terms_and_conditions: form.terms_and_conditions,
        delivery_timeline: form.delivery_timeline,
        payment_terms: form.payment_terms,
      };
      await api.patch(`/quotations/${q.id}/edit`, body);
      toast.success("Quotation updated — download a fresh PDF to reflect changes");
      setOpen(false);
      onSaved && onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 border border-zinc-200">
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="edit-charges-toggle"
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50"
      >
        <div className="text-left">
          <p className="overline text-[10px]">Editable</p>
          <p className="font-display text-lg mt-1">Charges, Discount, Inclusions &amp; Terms</p>
          <p className="text-[11px] text-zinc-500 mt-1">Adjust packaging / branding / shipping / GST / discount and the terms text before regenerating the PDF.</p>
        </div>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Edit ▾"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 p-5 space-y-5 bg-zinc-50">
          {/* Charges row */}
          <div>
            <p className="overline text-[10px] mb-2">Charges &amp; Tax</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { k: "packaging_charges", label: "Packaging (₹)" },
                { k: "branding_charges", label: "Branding (₹)" },
                { k: "shipping_charges", label: "Shipping (₹)" },
                { k: "gst_percent", label: "GST %" },
              ].map(({ k, label }) => (
                <div key={k}>
                  <p className="text-[10px] text-zinc-500">{label}</p>
                  <input
                    type="number"
                    min={0}
                    value={form[k]}
                    onChange={(e) => update(k, e.target.value)}
                    data-testid={`edit-${k}`}
                    className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white font-mono text-sm focus:border-[#002FA7] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Discount override */}
          <div>
            <p className="overline text-[10px] mb-2">Discount (this quote only — overrides global)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-zinc-500">Type</p>
                <select
                  value={form.discount_type || ""}
                  onChange={(e) => update("discount_type", e.target.value)}
                  data-testid="edit-discount-type"
                  className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white text-sm focus:border-[#002FA7] outline-none"
                >
                  <option value="">— Use global —</option>
                  <option value="flat">Flat ₹</option>
                  <option value="percent">Percent %</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Value</p>
                <input
                  type="number"
                  min={0}
                  value={form.discount_value}
                  onChange={(e) => update("discount_value", e.target.value)}
                  data-testid="edit-discount-value"
                  className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white font-mono text-sm focus:border-[#002FA7] outline-none"
                  disabled={!form.discount_type}
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Label</p>
                <input
                  type="text"
                  value={form.discount_label}
                  onChange={(e) => update("discount_label", e.target.value)}
                  data-testid="edit-discount-label"
                  className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white text-sm focus:border-[#002FA7] outline-none"
                  disabled={!form.discount_type}
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Leave Type blank to fall back to the global discount from the Discount admin page.</p>
          </div>
          {/* Text overrides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500">Inclusions (separate with ;)</p>
              <textarea
                rows={4}
                value={form.inclusions}
                onChange={(e) => update("inclusions", e.target.value)}
                data-testid="edit-inclusions"
                className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white text-sm focus:border-[#002FA7] outline-none resize-y"
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Terms &amp; Conditions (separate with ;)</p>
              <textarea
                rows={4}
                value={form.terms_and_conditions}
                onChange={(e) => update("terms_and_conditions", e.target.value)}
                data-testid="edit-terms"
                className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white text-sm focus:border-[#002FA7] outline-none resize-y"
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Delivery timeline</p>
              <textarea
                rows={2}
                value={form.delivery_timeline}
                onChange={(e) => update("delivery_timeline", e.target.value)}
                data-testid="edit-delivery"
                className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white text-sm focus:border-[#002FA7] outline-none resize-y"
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Payment terms</p>
              <textarea
                rows={2}
                value={form.payment_terms}
                onChange={(e) => update("payment_terms", e.target.value)}
                data-testid="edit-payment"
                className="mt-1 w-full px-2 py-1.5 border border-zinc-300 bg-white text-sm focus:border-[#002FA7] outline-none resize-y"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button onClick={() => setOpen(false)} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
            <button
              onClick={save}
              disabled={saving}
              data-testid="edit-charges-save"
              className="px-5 py-2 bg-[#002FA7] hover:bg-[#002277] text-white text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save & recompute total"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
