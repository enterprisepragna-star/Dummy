import React, { useEffect, useState, useMemo } from "react";
import api, { imageUrl, formatINR } from "@/lib/api";
import { ADMIN } from "@/constants/testIds";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ArrowRight, Truck, Percent, Mail } from "lucide-react";

export default function NewQuotationPage() {
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [shipping, setShipping] = useState("");
  const [packaging, setPackaging] = useState("");
  const [branding, setBranding] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [subject, setSubject] = useState("");
  const [deliveryTimeline, setDeliveryTimeline] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [terms, setTerms] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Cart stores quantity as STRING so user can type freely (incl. empty)
  const [cart, setCart] = useState({}); // code -> {product, qtyText}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(p =>
      p.visible !== false && (
        !s || p.code.toLowerCase().includes(s) || (p.items || "").toLowerCase().includes(s)
      )
    );
  }, [products, q]);

  const add = (p) => {
    setCart(prev => {
      if (prev[p.code]) return prev; // already added, leave qty as-is
      return { ...prev, [p.code]: { product: p, qtyText: String(p.moq || 1) } };
    });
  };

  const setQtyText = (code, text) => {
    // Allow free typing including empty string. Strip non-digits.
    const clean = String(text).replace(/[^0-9]/g, "");
    setCart(prev => prev[code] ? { ...prev, [code]: { ...prev[code], qtyText: clean } } : prev);
  };
  const stepQty = (code, delta) => {
    setCart(prev => {
      if (!prev[code]) return prev;
      const cur = parseInt(prev[code].qtyText || "0", 10) || 0;
      const n = Math.max(0, cur + delta);
      return { ...prev, [code]: { ...prev[code], qtyText: String(n) } };
    });
  };

  const remove = (code) => setCart(prev => { const c = { ...prev }; delete c[code]; return c; });

  const items = Object.values(cart);
  const linesValid = items.map(({ product, qtyText }) => {
    const n = parseInt(qtyText || "0", 10) || 0;
    return { product, quantity: n };
  });
  const subtotal = linesValid.reduce((s, x) => s + x.quantity * x.product.oncost_price, 0);
  const shippingNum = Math.max(0, parseFloat(shipping || "0") || 0);
  const packagingNum = Math.max(0, parseFloat(packaging || "0") || 0);
  const brandingNum = Math.max(0, parseFloat(branding || "0") || 0);
  const gstNum = Math.max(0, parseFloat(gstPercent || "0") || 0);
  const preTax = subtotal + shippingNum + packagingNum + brandingNum;
  const gstAmount = +((preTax * gstNum) / 100).toFixed(2);
  const grand = +(preTax + gstAmount).toFixed(2);

  const submit = async () => {
    if (!customer.trim()) return toast.error("Customer name required");
    const linesToSend = linesValid.filter(x => x.quantity > 0);
    if (linesToSend.length === 0) return toast.error("Add at least one product with quantity ≥ 1");
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      return toast.error("Enter a valid email or leave it empty");
    }
    setBusy(true);
    try {
      const { data } = await api.post("/quotations", {
        customer_name: customer.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim(),
        customer_company: customerCompany.trim(),
        place: place.trim(),
        notes: notes.trim(),
        valid_until: validUntil || null,
        shipping_charges: shippingNum,
        packaging_charges: packagingNum,
        branding_charges: brandingNum,
        gst_percent: gstNum,
        subject: subject.trim(),
        delivery_timeline: deliveryTimeline.trim(),
        payment_terms: paymentTerms.trim(),
        inclusions: inclusions.trim(),
        terms_and_conditions: terms.trim(),
        items: linesToSend.map(x => ({ product_id: x.product.id, quantity: x.quantity })),
      });
      toast.success(`Quotation ${data.quotation_id} created`);
      nav(`/admin/quotations/${data.id}`);
    } catch (e) {
      toast.error("Could not create quotation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="overline">Sales</p>
      <h1 className="font-display text-4xl font-light mt-1 tracking-tight">New Quotation</h1>
      <p className="text-sm text-zinc-500 mt-2">Fill the customer details, pick products, set MOQ / shipping / GST. Save to generate a public link & PDF.</p>

      {/* Customer block */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Customer name *</p>
          <input
            data-testid={ADMIN.newQuoteCustomer}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="e.g. Mr. Sharma"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-display text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Customer company</p>
          <input
            data-testid="newq-company"
            value={customerCompany}
            onChange={(e) => setCustomerCompany(e.target.value)}
            placeholder="e.g. Acme Corp Pvt Ltd"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-display text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px] flex items-center gap-1"><Mail size={10} /> Customer email</p>
          <input
            data-testid="newq-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="purchase@acme.com"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-display text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Customer phone</p>
          <input
            data-testid="newq-phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+91 ……"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-display text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Place of order</p>
          <input
            data-testid={ADMIN.newQuotePlace}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Bengaluru"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-display text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Valid until</p>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-mono text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200">
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Packaging (₹)</p>
          <input
            data-testid="newq-packaging"
            type="number"
            min={0}
            value={packaging}
            onChange={(e) => setPackaging(e.target.value)}
            placeholder="0"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-mono text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px]">Branding / Print (₹)</p>
          <input
            data-testid="newq-branding"
            type="number"
            min={0}
            value={branding}
            onChange={(e) => setBranding(e.target.value)}
            placeholder="0"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-mono text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px] flex items-center gap-1"><Truck size={10} /> Shipping (₹)</p>
          <input
            data-testid="newq-shipping"
            type="number"
            min={0}
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            placeholder="0"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-mono text-lg outline-none"
          />
        </div>
        <div className="bg-white p-5">
          <p className="overline text-[10px] flex items-center gap-1"><Percent size={10} /> GST %</p>
          <input
            data-testid="newq-gst"
            type="number"
            min={0}
            max={100}
            value={gstPercent}
            onChange={(e) => setGstPercent(e.target.value)}
            placeholder="0 (e.g. 18)"
            className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 font-mono text-lg outline-none"
          />
        </div>
      </div>

      <div className="mt-2 border border-zinc-200 p-5 bg-white">
        <p className="overline text-[10px]">Notes (optional)</p>
        <textarea
          data-testid={ADMIN.newQuoteNotes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Payment terms, delivery, customization etc."
          className="mt-2 w-full border-b border-zinc-200 focus:border-[#002FA7] py-2 text-sm outline-none resize-none"
        />
      </div>

      {/* Advanced — letterhead overrides */}
      <div className="mt-2 border border-zinc-200 bg-white">
        <button
          type="button"
          onClick={() => setShowAdvanced(s => !s)}
          data-testid="newq-toggle-advanced"
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-50 text-left"
        >
          <div>
            <p className="overline text-[10px]">Letterhead overrides</p>
            <p className="text-xs text-zinc-500 mt-0.5">Subject line, inclusions, delivery timeline & payment terms (defaults are used if left blank).</p>
          </div>
          <span className="text-zinc-500 text-sm">{showAdvanced ? "Hide ▴" : "Show ▾"}</span>
        </button>
        {showAdvanced && (
          <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-zinc-200 pt-4">
            <div className="lg:col-span-2">
              <p className="overline text-[10px]">Subject</p>
              <input
                data-testid="newq-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Quotation for Corporate Gifting Requirements"
                className="mt-2 w-full border-b border-zinc-300 focus:border-[#002FA7] py-2 text-sm outline-none"
              />
            </div>
            <div>
              <p className="overline text-[10px]">Inclusions (separate with ;)</p>
              <textarea
                data-testid="newq-inclusions"
                rows={3}
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                placeholder="Premium packaging; Logo branding; Quality assurance; Secure dispatch"
                className="mt-2 w-full border border-zinc-300 focus:border-[#002FA7] p-2 text-sm outline-none resize-y"
              />
            </div>
            <div>
              <p className="overline text-[10px]">Delivery timeline</p>
              <textarea
                data-testid="newq-delivery"
                rows={3}
                value={deliveryTimeline}
                onChange={(e) => setDeliveryTimeline(e.target.value)}
                placeholder="7-10 business days from order confirmation"
                className="mt-2 w-full border border-zinc-300 focus:border-[#002FA7] p-2 text-sm outline-none resize-y"
              />
            </div>
            <div className="lg:col-span-2">
              <p className="overline text-[10px]">Payment terms</p>
              <textarea
                data-testid="newq-payment"
                rows={2}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="50% advance on confirmation, 50% before dispatch. Bank Transfer / Cheque only."
                className="mt-2 w-full border border-zinc-300 focus:border-[#002FA7] p-2 text-sm outline-none resize-y"
              />
            </div>
            <div className="lg:col-span-2">
              <p className="overline text-[10px]">Terms &amp; Conditions (separate with ;)</p>
              <textarea
                data-testid="newq-terms"
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Leave blank to use the default 10-point terms. Separate each clause with a semicolon."
                className="mt-2 w-full border border-zinc-300 focus:border-[#002FA7] p-2 text-sm outline-none resize-y"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Overrides the default T&amp;C block on the PDF.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Product picker */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-2xl font-medium tracking-tight">Pick products</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="pl-9 pr-3 py-2 border border-zinc-300 text-sm w-64"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-zinc-200 border border-zinc-200 max-h-[600px] overflow-auto">
            {filtered.map(p => {
              const inCart = !!cart[p.code];
              return (
                <div key={p.id} className="bg-white p-3 flex gap-3">
                  {p.image && <img src={imageUrl(p.image)} alt={p.code} className="w-16 h-16 object-contain bg-white border border-zinc-200 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs font-bold">{p.code}</p>
                      <p className="font-display font-medium text-sm">{formatINR(p.oncost_price)}</p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.set_type} — {p.items}</p>
                    <button
                      data-testid={ADMIN.newQuoteAddItem(p.code)}
                      onClick={() => add(p)}
                      className={`mt-2 text-[11px] px-2 py-1 border transition-all ${inCart ? "border-[#002FA7] text-[#002FA7]" : "border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7]"}`}
                    >
                      {inCart ? `Added • Qty ${cart[p.code].qtyText || 0}` : `+ Add (MOQ ${p.moq})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart summary */}
        <div className="border border-zinc-200 bg-white p-5 self-start lg:sticky lg:top-6">
          <p className="overline">Line items ({items.length})</p>
          {items.length === 0 && <p className="text-sm text-zinc-500 mt-4">No items yet. Pick from the catalog.</p>}
          <div className="mt-3 max-h-[420px] overflow-auto">
            {items.map(({ product: p, qtyText }) => {
              const qtyNum = parseInt(qtyText || "0", 10) || 0;
              const lineTot = qtyNum * p.oncost_price;
              return (
                <div key={p.code} className="py-3 border-b border-zinc-200 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] font-bold">{p.code}</p>
                    <p className="text-xs text-zinc-500 line-clamp-1">{p.set_type}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button onClick={() => stepQty(p.code, -1)} className="w-6 h-6 border border-zinc-300 flex items-center justify-center hover:border-[#002FA7]"><Minus size={10} /></button>
                      <input
                        data-testid={ADMIN.newQuoteQty(p.code)}
                        type="text"
                        inputMode="numeric"
                        value={qtyText}
                        onChange={(e) => setQtyText(p.code, e.target.value)}
                        placeholder="qty"
                        className="w-16 text-center border border-zinc-300 py-1 font-mono text-xs outline-none focus:border-[#002FA7]"
                      />
                      <button onClick={() => stepQty(p.code, 1)} className="w-6 h-6 border border-zinc-300 flex items-center justify-center hover:border-[#002FA7]"><Plus size={10} /></button>
                      <span className="ml-2 text-[10px] text-zinc-500">MOQ {p.moq}</span>
                      {qtyNum > 0 && qtyNum < p.moq && <span className="text-[10px] text-amber-600 ml-1">below MOQ</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">{formatINR(lineTot)}</p>
                    <button onClick={() => remove(p.code)} className="mt-1 text-zinc-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown */}
          <div className="mt-4 pt-3 border-t border-zinc-200 space-y-1 text-sm">
            <div className="flex items-center justify-between"><span className="text-zinc-500">Subtotal (Products)</span><span className="font-mono">{formatINR(subtotal)}</span></div>
            {packagingNum > 0 && <div className="flex items-center justify-between"><span className="text-zinc-500">Packaging</span><span className="font-mono">{formatINR(packagingNum)}</span></div>}
            {brandingNum > 0 && <div className="flex items-center justify-between"><span className="text-zinc-500">Branding / Print</span><span className="font-mono">{formatINR(brandingNum)}</span></div>}
            {shippingNum > 0 && <div className="flex items-center justify-between"><span className="text-zinc-500">Shipping</span><span className="font-mono">{formatINR(shippingNum)}</span></div>}
            <div className="flex items-center justify-between"><span className="text-zinc-500">GST ({gstNum || 0}%)</span><span className="font-mono">{formatINR(gstAmount)}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t-2 border-zinc-900 flex items-center justify-between">
            <p className="overline">Grand total</p>
            <p className="font-display text-2xl font-medium">{formatINR(grand)}</p>
          </div>
          <button
            data-testid={ADMIN.newQuoteSubmit}
            disabled={busy}
            onClick={submit}
            className="mt-4 w-full bg-[#002FA7] hover:bg-[#002277] text-white py-3 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Saving…" : (<>Create quotation <ArrowRight size={14} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
