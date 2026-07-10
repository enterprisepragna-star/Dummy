# ONCOST — Portal Access Reference
_Last updated: 10 Jul 2026_

> **Domain in transition**: once you re-link `oncostcatalog.in` at the **root** in
> Emergent Dashboard → Home → Deployment → **Link Domain** (no `/catalog` suffix),
> every URL below will be reachable on the new domain. Until then the old
> `catalog-markup.emergent.host` URLs continue to work.

---

## 1. Live URLs — after domain is mapped at the root

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

## 2. Login credentials

### Admin (super admin — full access)
| Field | Value |
| --- | --- |
| Email | `admin@oncost.shop` |
| Password | `oncost@2026` |
| Role | `admin` |
| Notes | Login also accepts your registered email OR your Employee ID (partners). Change the password after first login via the "Forgot password?" flow or by asking me to update `ADMIN_PASSWORD` in the deployment secrets. |

### Partners (approved, live in the system)
| Full name | Employee ID | Email (login) | Referral code | Password |
| --- | --- | --- | --- | --- |
| Deepa Iyer | `ONCOST-EMP-0001` | `deepa.iyer@example.com` | `ONCOST01` | _Temporary password was shown once on approval and sent via welcome email. Partner is flagged `must_change_password=true`, so they'll be prompted to reset on first login._ |

> **How to recover a partner's password**
> - The partner can go to `/forgot-password`, enter their email or Employee ID, and get a reset link valid for 24 hours.
> - Or, from the Admin → OPMS → Partner detail page, use the (upcoming) "Force password reset" action once we build it (mentioned in next action items).
> - Alternatively, ask me to issue a fresh temporary password from Mongo — just say which partner.

> **Passwords are stored as bcrypt hashes** — nobody, including me, can read the plaintext of an existing partner password. You can only reset it.

---

## 3. Referral & sharing links

| For | Link format |
| --- | --- |
| Public referral landing page | `https://oncostcatalog.in/refer/<REFERRAL_CODE>` |
| Example (Deepa Iyer) | `https://oncostcatalog.in/refer/ONCOST01` |
| Quotation share | `https://oncostcatalog.in/q/<share_token>` — token appears in `/admin/quotations` |

Partners can grab their own referral link (+ WhatsApp share) from **Partner Dashboard → Your referral link**.

---

## 4. Post-domain-mapping checklist

Once `oncostcatalog.in` is mapped at the root:

1. Go to **Emergent Dashboard → Deployment Secrets Panel** and set (or update):
   - `REACT_APP_BACKEND_URL` = `https://oncostcatalog.in`  _(frontend)_
   - `PORTAL_URL` = `https://oncostcatalog.in`  _(backend — used in all outbound emails)_
2. **Redeploy** the app so the new envs take effect.
3. Verify emails:
   - Request a password reset for `admin@oncost.shop` from `/forgot-password`.
   - The reset link inside the email should point to `https://oncostcatalog.in/reset-password?token=…`.
4. (Recommended) Verify your sender domain on Resend so emails go out to **any** recipient — currently only `enterprisepragna@gmail.com` receives them due to Resend testing mode.

---

## 5. Where the source of truth for env vars lives

| Var | Preview `.env` file | Production |
| --- | --- | --- |
| `MONGO_URL` | `backend/.env` (do not edit) | Auto-managed |
| `DB_NAME` | `backend/.env` (do not edit) | Auto-managed |
| `JWT_SECRET` | `backend/.env` | Deployment Secrets Panel |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `backend/.env` | Deployment Secrets Panel |
| `RESEND_API_KEY` | `backend/.env` | Deployment Secrets Panel |
| `SENDER_EMAIL` / `SENDER_NAME` | `backend/.env` | Deployment Secrets Panel |
| `PORTAL_URL` | `backend/.env` → `https://oncostcatalog.in` | Deployment Secrets Panel — set to `https://oncostcatalog.in` |
| `REACT_APP_BACKEND_URL` | `frontend/.env` (preview URL — keep as is) | Deployment Secrets Panel — set to `https://oncostcatalog.in` |
| `COMPANY_*` (letterhead) | `backend/.env` | Deployment Secrets Panel |
| `PAYOUT_THRESHOLD` | `backend/.env` (₹1,00,000) | Deployment Secrets Panel |

---

## 6. Quick sanity checks (curl)

```bash
# Should return 200 + admin user object
curl -X POST https://oncostcatalog.in/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@oncost.shop","password":"oncost@2026"}'

# Should return the partner info panel for the referral page
curl https://oncostcatalog.in/api/refer/ONCOST01

# Should return {"ok": true, ...} — issues a password reset email
curl -X POST https://oncostcatalog.in/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@oncost.shop"}'
```
