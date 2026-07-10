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

## 2026-07-10 — OPMS (Partner Management System) MVP-1
Extends the existing FastAPI + React + Mongo app (no Next.js/Supabase migration).

**Backend** (`/app/backend/opms.py` module wired into server.py):
- 8 roles seeded: super_admin, admin, sales_manager, sales_executive, sales_partner, procurement_partner, franchise_partner, viewer.
- Endpoints: `POST /api/partners/register` (public), `POST /api/partners/upload?kind=` (uploads photo/resume/PAN/Aadhaar via Emergent Object Storage), `GET /api/partners` (admin, filter status+role), `GET /api/partners/{id}`, `POST /api/partners/{id}/approve|reject|suspend`, `GET /api/partners/{id}/id-card.pdf` (business-card sized PDF w/ QR), `GET /api/partner/me`, `GET /api/partner/dashboard`.
- Approve action: atomically increments `opms_counters.employee`, generates `ONCOST-EMP-{4-digit}`, `OC{RolePrefix}{4-digit}` partner code, `ONCOST{2-digit}` referral code, sets joining_date + card_valid_until (+365 days), creates login user in `users` collection with random temp password (returned once to admin).
- Login endpoint extended: accepts `identifier` field which may be Email OR Employee ID (`ONCOST-EMP-XXXX`); legacy `email` field still supported.
- All admin users backfilled with `role: "admin"` at startup.
- ID Card PDF: 85.6×54 mm landscape, ONCOST navy header + gold rule, photo box, name, role, emp id, partner code, joining date, emergency contact, VALID UNTIL, QR code (encodes emp id + partner code + mobile).

**Frontend**:
- Public **/partners/register** — 4-step wizard (Personal → Contact → Professional → Bank + Emergency) with document uploads.
- Admin **/admin/opms/partners** — stat pills by status + search + role filter + table.
- **/admin/opms/partners/:id** — full detail view with sections + Approve / Reject / Suspend actions; on approve, credentials (emp id / partner code / referral code / login email / temp password) surfaced in a success banner with copy buttons.
- ID Card PDF download button on approved partners.
- Partner **/partner/dashboard** — KPI grid (leads/sales/commission all zero until modules land), codes card, notifications feed, coming-soon strip.
- Login page now accepts Email or Employee ID; login button routes admins → /admin, partners → /partner/dashboard based on role.
- ProtectedRoute now supports `roles=[...]` param; admin pages restricted to `admin`/`super_admin`.

**Known limitations (documented for next iteration)**:
- Email automation (welcome email w/ credentials) not wired — admin must share credentials manually via the success banner. Adding Resend/SendGrid will drop this in.
- Lead Management, Sales entry, Commission Engine, Payment Tracker, Performance module, Reports, Notifications, Search — all deferred to subsequent MVP iterations. Dashboard cards are stubbed with zeros to match the final shape.
- Password reset & OTP flows — pending.
- Row-level security equivalent — implemented at the API layer (admin-only endpoints check `role in {admin, super_admin}`); Mongo doesn't have RLS.

## 2026-07-10 — Resend email + Lead Management (OPMS)
**Email (Resend)**: New `emailer.py` with `is_enabled`, `send_email`, `render_welcome_email`, `render_lead_assigned_email`. Uses `resend>=2.0.0`, keyed off `RESEND_API_KEY` env. Sender defaults to `onboarding@resend.dev` (testing mode) until a domain is verified in resend.com. Falls back silently to no-op if key missing.
- Wired into `POST /api/partners/{id}/approve` — approval response now includes `email_status` field.
- Wired into `POST /api/leads` (new lead with assignee) and `POST /api/leads/{id}/assign`.
- Note: In Resend testing mode, emails only deliver to the account owner's verified address. Real delivery to arbitrary partners requires a verified domain.

**Lead Management (MVP)**: Full CRUD in `opms.py`.
- Schema: `leads` collection {name, company, industry, contact_person, designation, phone, email, source, status, notes, estimated_value, assigned_to (user_id), assigned_at, created_by, created_at, updated_at, closed_at, lost_reason}.
- Statuses: new → contacted → quotation_sent → negotiation → won/lost.
- Sources: LinkedIn, Apollo, Referral, Website, Walk-in, Cold Call, Event, Other.
- Endpoints: `POST/GET /api/leads`, `GET/PATCH/DELETE /api/leads/{id}`, `POST /api/leads/{id}/assign`, `GET /api/leads-assignees` (list eligible partner users for dropdowns).
- RBAC: admin sees & edits all leads; partner sees & edits only their assigned leads (allowed fields: status, notes, contact_person, phone, email, designation, estimated_value, lost_reason).
- Partner dashboard `total_leads`, `closed_leads`, `assigned_leads` now hydrate from real DB counts.

**Frontend**:
- Admin `/admin/opms/leads` — KPI strip (Pipeline / Won / Active / Assignees), status chips, search, table with hydrated `assigned_to_name` + `assigned_to_employee_id`. `+ New Lead` modal.
- Admin `/admin/opms/leads/:id` — Full edit page with sections (Company & Contact, Sales, Assignment with reassign dropdown that fires email, Notes, System metadata).
- Partner `/partner/leads` — Card grid of leads assigned to the logged-in partner + status chips + click-to-edit modal with allowed fields.
- Partner Dashboard now has a "Open My Leads →" CTA.
- Sidebar nav updated with `OPMS · Partner Mgmt → Leads`.

## 2026-07-10 — Commission Engine (OPMS)
**Backend `/app/backend/commissions.py`**:
- **Commission Rules** (editable, no code changes): `name`, `applies_to_role` (or Any), `applies_to_category_id` (or Any), `partner_user_id` (or Any), `min_order_value`, `max_order_value`, `commission_percent`, `priority`, `active`. Match strategy: highest priority active rule whose all constraints pass.
- **Commissions** collection: auto-created on quotation acceptance if quote has `partner_user_id`. Snapshot: order_amount, rule_id/name, %, amount, partner_user_id/name/employee_id/role, sale_id, quotation_id, customer info, status (pending|paid), UTR/reference/remarks/paid_at/paid_by.
- Endpoints:
  - `POST/GET/PUT/DELETE /api/commission-rules`
  - `GET /api/commissions` (admin: all; partner: their own; `?status=` filter)
  - `GET /api/commissions/summary` (pending/paid counts + amounts)
  - `GET /api/commissions/{id}`
  - `POST /api/commissions/{id}/pay` (payment_reference, utr_number, remarks)
  - `POST /api/commissions/{id}/revert`
- Quotation: added `partner_user_id` field (optional) — copied into sales and used to trigger commission calc.
- Partner dashboard hydrates real commission_earned + commission_pending + sales_month + sales_year.

**Frontend**:
- Admin `/admin/opms/commission-rules` — full CRUD, priority up/down, on/off toggle, edit modal with role/category/order-range/percent inputs.
- Admin `/admin/opms/commissions` — Payout Tracker with pending/paid KPIs, filter chips, search by partner/customer/UTR, Mark-paid modal (UTR + reference + remarks), Revert action.
- Partner `/partner/commissions` — Read-only ledger with pending/paid KPIs, per-record details, UTR shown when paid.
- New Quotation form: new "Attribute to a Partner (optional)" section — dropdown of approved partner users. Enables commission auto-calc.
- Sidebar nav updated: Partners · Leads · Commission Rules · Payout Tracker.
- Partner Dashboard: added "My Commissions →" CTA card.

**Verified E2E**: Created 3 rules, attributed quote to a partner, accepted quote, saw correct rule matched by priority (large-order rule outranks default rule when min_order_value crossed), commission record generated, marked paid with UTR, summary correctly tallied.

---

## 2026-07-10 — Password Recovery (Forgot / Reset)

**Backend** (`server.py`, `emailer.py`):
- New collection `password_resets` with unique index on `token` and TTL index on `expires_at` (auto-cleanup by Mongo).
- `POST /api/auth/forgot-password` — accepts `identifier` (email or Employee ID). Always returns generic 200 to prevent account enumeration. Prior unused tokens for the same user are invalidated so only the newest link works.
- `POST /api/auth/reset-password` — accepts `token` + `new_password` (min 8 chars). Marks token used on success. Single-use.
- `GET /api/auth/reset-password/verify?token=…` — cheap check the frontend calls to decide whether to show the form or the "invalid/expired" panel.
- Reset link points to `PORTAL_URL + /reset-password?token=…` (uses live domain env).
- Email dispatched via Resend using new `render_password_reset_email` template. If Resend not configured, link is logged (never blocks the flow).
- Token TTL: **24 hours** (per user choice).

**Frontend**:
- New `/forgot-password` (`ForgotPasswordPage.jsx`) — identifier input, generic success confirmation, "send again" affordance.
- New `/reset-password?token=…` (`ResetPasswordPage.jsx`) — verifies token, shows form for valid tokens, dedicated "expired" / "invalid" panel with a link to request a new one, redirects to `/login` after success.
- `LoginPage.jsx` — added "Forgot password?" link under the password field.
- Works for **both** admin and partner accounts (unified auth path).

**Verified E2E** (curl + Playwright):
- Unknown identifier → generic 200 (no enumeration).
- Admin identifier → token created in Mongo, reset link generated.
- Verify endpoint returns `{valid:true, email:…}` for fresh tokens, `{valid:false, reason:"invalid_or_used"}` otherwise.
- Reset with <8 char password → 400.
- Reset with correct token → 200, subsequent login works, second reuse of the same token → 400.
- Frontend: forgot-password success screen, reset-password invalid-token panel render correctly.

**Known constraint (unchanged)**: Resend still in testing mode → emails only deliver to `enterprisepragna@gmail.com` until the domain is verified on Resend. Any reset requested for other addresses still creates a valid token (visible in Mongo / logs) but the customer won't receive the email until the domain is verified.

---

## 2026-07-10 — Custom Domain Mapping + Referral Landing Page

**Custom domain (`oncostcatalog.in`)**:
- User already mapped `/catalog`. For all other routes (`/login`, `/admin/*`, `/partner/*`, `/partners/register`, `/refer/*`, `/q/*`) they need to re-link the domain at the **root** (no path suffix) in **Emergent Dashboard → Home → deployment → Link Domain**.
- Post-mapping, the following production env vars need updating in the Deployment Secrets Panel:
  - `PORTAL_URL=https://oncostcatalog.in` (backend)
  - `REACT_APP_BACKEND_URL=https://oncostcatalog.in` (frontend)
- Preview `backend/.env` `PORTAL_URL` already updated to `https://oncostcatalog.in` so emailed links point to the new domain.

**Referral Landing Page — `/refer/<referral_code>`**:
- **Backend (`opms.py`)**:
  - Module-level `ReferralLeadIn` model + two public endpoints under router:
    - `GET /api/refer/{code}` → returns `{valid, referral_code, partner_first_name, role_label}` for approved partners only. First name only — no full contact info leak.
    - `POST /api/refer/{code}/lead` → creates a lead with `source="Referral"`, `assigned_to = partner_user_id`, `referral_code`, `referred_by_partner_id`. Notifies both partner (via `render_referral_lead_email`) and admin (via `render_referral_lead_admin_email`). Auto-assignment ensures the lead shows up in `/admin/opms/leads` already tagged to the partner and in the partner's `/partner/leads`.
- **Frontend**:
  - New `ReferralLandingPage.jsx` at `/refer/:code` — dark editorial hero ("Deepa invited you to ONCOST"), 3-step "what happens next" panel, capture form (name, company, email, phone, requirement) + "Browse catalog first" button that carries `?ref=CODE` to the catalog.
  - `PublicCatalogPage.jsx` — persists `?ref=CODE` in `localStorage` under `oncost_ref` so future flows (quotation view etc.) can pick it up.
  - `PartnerDashboardPage.jsx` — new "Your referral link" widget in the codes card: shows full `PORTAL_URL/refer/<code>` link, Copy button, WhatsApp share (`https://wa.me/?text=…`), Preview link that opens the landing page in a new tab.
  - Route registered in `App.js`.
- **E2E verified** via curl + Playwright:
  - GET info for valid code returns partner first name; invalid code → 404.
  - POST lead with empty name → 400 "Name is required"; POST with valid payload → 200 with `assigned=true`, lead created with correct `source/referral_code/referred_by_partner_id/assigned_to`.
  - Frontend hero, form, thank-you, and invalid-code states all render correctly.
- **Email delivery**: same Resend testing-mode limitation applies — actual email delivery only reaches `enterprisepragna@gmail.com` until the sender domain is verified on Resend. Leads are still fully created and visible in admin/partner portals.
