# ONCOST Catalog & Quotation App — PRD

## Problem statement (verbatim from user)
> "I have a business catalog PDF, I want the price of each item to be incremented by 50 if the price is below 1000 rs, above 1000 rs it has to be incremented by 100. Can you edit the PDF and share me the updated pdf to download and send to a customer. I have each image to use as a similar digital catalogue. I am fine if not pdf, a .html view is also ok with updated values of price. Should be able to share the quotation as part of ONCOST, and they should see my updated prices, not the list I used."

User clarifications:
1. Prices not static — need control to update
2. Both PDF and HTML output
3. Shareable HTML link under admin control
4. SG is wholesaler, ONCOST is reseller brand
5. Fields: customer name, order/quotation ID, place of order, MOQ

## Personas
- **Admin (ONCOST owner)** — manages catalog, sets margins, creates customer quotations
- **Customer (corporate buyer)** — receives shareable link, views quotation, downloads PDF

## Core requirements
- Admin authentication (JWT)
- Product catalog seeded from SG PDF (92 products with images)
- Configurable pricing rules (threshold + below/above increments)
- Per-item price override
- Visibility toggle per product
- Quotation creation with line items, MOQ awareness
- Shareable public link per quotation (toggle active/inactive)
- Public quotation page (web view, print-friendly)
- Public catalog page
- PDF generation for quotations (downloadable from admin or public link)
- All customer-facing pages use ONCOST branding (no SG reference, no SG cost exposed)

## Implemented (Feb 2026)
- ✅ Backend FastAPI with MongoDB, bcrypt + JWT auth, admin seed
- ✅ Products extracted from PDF (92 items + product photos)
- ✅ Pricing rule engine (configurable)
- ✅ Products CRUD (admin) with override, visibility
- ✅ Quotation create/list/detail/toggle/delete + auto ID (ONC-YYYYMM-NNNN)
- ✅ Public share endpoints (HTML + PDF via /share/{token}/...)
- ✅ Public catalog browse
- ✅ React frontend: Login, Admin dashboard (Products, Pricing Rules, Quotations, New Quotation, Detail), Public Catalog, Public Quotation viewer
- ✅ Print-friendly public quotation view
- ✅ Swiss high-contrast design (Outfit + IBM Plex Sans, International Klein Blue)

## Backlog (P1)
- Email/WhatsApp share button on quotation detail
- Bulk price update tool
- Customer-side acceptance/comment

## Backlog (P2)
- Customer database / repeat-customer dropdown
- Tax / GST calculation toggle
- Logo upload (replace ONCOST text mark)
- Multi-currency

## Auth credentials
- Admin: admin@oncost.shop / oncost@2026

## 2026-06-25 — Categories + Add Product + Professional Quotation Terms
- **Categories CRUD**: New `/admin/categories` page with create/edit/delete/visibility/banner-image upload.
- **Add Product flow**: New "+ Add Product" red button on Products page opens modal with Code, Set type, Description, Supplier price, MOQ, Category dropdown, optional Image upload.
- **Edit Details enhanced**: Existing Edit Details modal now includes a Category dropdown so existing 92 products can be linked.
- **Category filter** on Products page header (All categories / per-category).
- **Quotation PDF**:
  - Updated default dispatch timeline to **10–15 business days**.
  - Payment policy enforced: **50% advance, Bank Transfer (NEFT/RTGS/IMPS) or Account Payee Cheque ONLY — NO Cash/UPI**. Highlighted in an amber callout box.
  - New 10-point **TERMS & CONDITIONS** section (validity, taxes, artwork approval, ±2% tolerance, jurisdiction, force majeure).
- **Existing 92 products and their images: untouched.** All admin-uploaded images remain intact.
- **Backend bug fix**: `POST /api/products` previously returned 500 because Motor mutates the inserted dict with `_id` (ObjectId, not JSON-serializable). Fixed by popping `_id` after insert.

## 2026-07-02 — Pricing toggle + Charges breakup + Discount + Editable T&C
- **Letterhead** updated in preview .env: `Tellapur, Hyderabad, Telangana - 500019` + `enterprisepragna@gmail.com`. Jurisdiction in T&C also switched to Hyderabad, Telangana. ⚠️ Production has its own immutable secrets — user MUST update `COMPANY_ADDRESS` and `COMPANY_EMAIL` in Deployment Panel → Secrets before redeploying.
- **Pricing rule active toggle** — `PricingRule.active: bool = True`. When OFF, `compute_oncost_price` returns sg_price unchanged. UI shows a green/amber banner + slider switch.
- **Global persistent Discount** — New `discount_config` singleton {active, type: flat|percent, value, label}. Admin console at `/admin/discount`. Applied automatically on every new quote unless per-quote overridden.
- **Charges breakup in quotations** — Added fields `packaging_charges`, `branding_charges` alongside existing `shipping_charges`, `gst_percent`. Math: subtotal + packaging + branding + shipping – discount → taxable → + GST → grand total.
- **PATCH /api/quotations/{qid}/edit** — Lets admin edit charges, discount override, GST, inclusions, T&C, delivery, payment terms on an existing quotation. Totals recompute server-side.
- **Quotation Detail — Edit charges panel** — Collapsible section on QuotationDetailPage with inputs for all editable fields; on Save it PATCHes the quote and reloads.
- **PDF totals table** — Now conditionally renders Packaging, Branding, Shipping, Less: Discount lines (green), then GST, then Grand Total. Legacy quotes without new fields render unchanged.
- **Bug fixes**: `PUT /api/pricing-rule` now propagates `active` field; GET defaults `active: true` for legacy docs.
