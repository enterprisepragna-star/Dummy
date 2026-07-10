# ONCOST — Portal Access Reference
_Last updated: 10 Jul 2026_

> **Security note**: this file is committed to the local Emergent git repo. Never write
> plaintext passwords or API keys in it. All secrets live only in `backend/.env`
> (preview) and the **Emergent Deployment Secrets Panel** (production).

> **Domain in transition**: once you re-link `oncostcatalog.in` at the **root** in
> Emergent Dashboard → Home → Deployment → **Link Domain** (no `/catalog` suffix),
> every URL below will be reachable on the new domain. Until then the old
> `catalog-markup.emergent.host` URLs continue to work.

---

## 1. Live URLs — after the domain is mapped at the root

### Public (no login required)
| Purpose | URL |
| --- | --- |
| Public product catalog | `https://oncostcatalog.in/catalog` |
| Partner registration | `https://oncostcatalog.in/partners/register` |
| Referral landing page | `https://oncostcatalog.in/refer/<REFERRAL_CODE>` |
| Individual quotation view | `https://oncostcatalog.in/q/<share_token>` |

### Auth
| Purpose | URL |
| --- | --- |
| Sign in (admin & partner) | `https://oncostcatalog.in/login` |
| Forgot password | `https://oncostcatalog.in/forgot-password` |
| Reset password (from email link) | `https://oncostcatalog.in/reset-password?token=…` |

### Admin console (role: `admin` or `super_admin`)
| Section | URL |
| --- | --- |
| Products | `https://oncostcatalog.in/admin/products` |
| Categories | `https://oncostcatalog.in/admin/categories` |
| Pricing rule | `https://oncostcatalog.in/admin/pricing-rule` |
| Discount config | `https://oncostcatalog.in/admin/discount` |
| Quotations — list | `https://oncostcatalog.in/admin/quotations` |
| Quotations — new | `https://oncostcatalog.in/admin/quotations/new` |
| Quotation detail | `https://oncostcatalog.in/admin/quotations/<quote_id>` |
| Sales | `https://oncostcatalog.in/admin/sales` |
| OPMS · Partners | `https://oncostcatalog.in/admin/opms/partners` |
| OPMS · Partner detail | `https://oncostcatalog.in/admin/opms/partners/<partner_id>` |
| OPMS · Leads | `https://oncostcatalog.in/admin/opms/leads` |
| OPMS · Lead detail | `https://oncostcatalog.in/admin/opms/leads/<lead_id>` |
| OPMS · Commission Rules | `https://oncostcatalog.in/admin/opms/commission-rules` |
| OPMS · Payout Tracker | `https://oncostcatalog.in/admin/opms/commissions` |
| OPMS · Incentives | `https://oncostcatalog.in/admin/opms/incentives` |

### Partner portal (role: any partner role)
| Section | URL |
| --- | --- |
| Partner Dashboard | `https://oncostcatalog.in/partner/dashboard` |
| My Leads | `https://oncostcatalog.in/partner/leads` |
| My Commissions | `https://oncostcatalog.in/partner/commissions` |
| My Profile / KYC / Bank | `https://oncostcatalog.in/partner/profile` |

---

## 2. Login accounts

### Admin (super admin — full access)
| Field | Value |
| --- | --- |
| Email | `admin@oncost.shop` |
| Password | _(rotated on 10 Jul 2026 — kept only in Emergent Deployment Secrets Panel and locally by owner)_ |
| Role | `admin` |
| Password last rotated | **2026-07-10** |
| Next rotation due | **2026-10-08** _(90-day policy — see §4)_ |

> To change the password: update `ADMIN_PASSWORD` in `backend/.env` (preview) and in the
> **Emergent Deployment Secrets Panel** (production), then restart / redeploy. The startup
> hook re-hashes the admin password from the env value automatically.

### Partners (approved, live in the system)
| Full name | Employee ID | Email (login) | Referral code |
| --- | --- | --- | --- |
| Deepa Iyer | `ONCOST-EMP-0001` | `deepa.iyer@example.com` | `ONCOST01` |

Partner passwords are stored as **bcrypt hashes** and cannot be read back by anyone
(including the agent). Recovery paths:

- Partner → `/forgot-password` (email or Employee ID) → reset link valid 24 hrs.
- Admin can trigger a fresh temp password by asking the agent to reset one for a
  specific partner (a "Force password reset" admin action is on the backlog).

---

## 3. Referral & sharing links

| For | Link format |
| --- | --- |
| Public referral landing page | `https://oncostcatalog.in/refer/<REFERRAL_CODE>` |
| Example (Deepa Iyer) | `https://oncostcatalog.in/refer/ONCOST01` |
| Quotation share | `https://oncostcatalog.in/q/<share_token>` — token appears in `/admin/quotations` |

Partners can grab their own referral link (+ WhatsApp share) from
**Partner Dashboard → Your referral link**.

---

## 4. Password rotation policy (90 days)

- **Admin account (`admin@oncost.shop`)** — rotate the password every **90 days**.
- **Rotation history**:
  | Rotation date | Notes |
  | --- | --- |
  | 2026-07-10 | Initial rotation. Also stamped on the admin user doc as `password_updated_at`. |
- **Next rotation due**: **2026-10-08**.
- The admin user's `password_updated_at` field in the `users` collection is the
  source of truth. To rotate:
  1. Choose a new strong password (mixed case, digits, symbol, ≥ 16 chars).
  2. Update `ADMIN_PASSWORD` in `backend/.env` (preview).
  3. Update `ADMIN_PASSWORD` in the **Emergent Deployment Secrets Panel** (production) and redeploy.
  4. Ask the agent to stamp `password_updated_at` on the admin doc and add a row above.
- **Partners** — no enforced rotation yet. If needed later, we can add a "must change every 90 days" flag on the user doc + a nag on login. Ping the agent when you want this turned on.

---

## 5. Post-domain-mapping checklist

Once `oncostcatalog.in` is mapped at the root:

1. Go to **Emergent Dashboard → Deployment Secrets Panel** and set (or update):
   - `REACT_APP_BACKEND_URL` = `https://oncostcatalog.in`  _(frontend)_
   - `PORTAL_URL` = `https://oncostcatalog.in`  _(backend — used in all outbound emails)_
   - `ADMIN_PASSWORD` = _the value from your notes for the current rotation window_
2. **Redeploy** the app so the new envs take effect.
3. Verify emails: request a password reset for `admin@oncost.shop` from `/forgot-password`
   and check that the reset link inside the email points to `https://oncostcatalog.in/...`.
4. (Recommended) Verify your sender domain on Resend so emails go out to any recipient —
   currently only `enterprisepragna@gmail.com` receives them due to Resend testing mode.

---

## 6. Env-var source of truth

| Var | Preview (`.env`) | Production |
| --- | --- | --- |
| `MONGO_URL`, `DB_NAME` | `backend/.env` (do not edit) | Auto-managed |
| `JWT_SECRET` | `backend/.env` | Deployment Secrets Panel |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `backend/.env` | Deployment Secrets Panel |
| `RESEND_API_KEY` | `backend/.env` | Deployment Secrets Panel |
| `SENDER_EMAIL` / `SENDER_NAME` | `backend/.env` | Deployment Secrets Panel |
| `PORTAL_URL` | `backend/.env` → `https://oncostcatalog.in` | Deployment Secrets Panel → same |
| `REACT_APP_BACKEND_URL` | `frontend/.env` (preview URL — keep as-is) | Deployment Secrets Panel → `https://oncostcatalog.in` |
| `COMPANY_*` (letterhead) | `backend/.env` | Deployment Secrets Panel |
| `PAYOUT_THRESHOLD` | `backend/.env` (₹1,00,000) | Deployment Secrets Panel |

---

## 7. Quick sanity checks (curl)

```bash
# Login — supply the CURRENT admin password from your local notes
curl -X POST https://oncostcatalog.in/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@oncost.shop","password":"<YOUR_ADMIN_PASSWORD>"}'

# Referral info for a partner
curl https://oncostcatalog.in/api/refer/ONCOST01

# Trigger a password reset email (does not reveal whether the account exists)
curl -X POST https://oncostcatalog.in/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@oncost.shop"}'
```
