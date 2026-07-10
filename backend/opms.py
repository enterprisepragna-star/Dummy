"""ONCOST Partner Management System (OPMS) — MVP module.
Adds:
- Partner registration (public)
- Partner document uploads (photo, resume, PAN, Aadhaar)
- Admin list / detail / approve / reject / suspend
- Auto-generated Employee ID, Partner Code, Referral Code, joining date
- Login by email OR Employee ID (see login patch in server.py)
- Partner-only endpoints: /me, /dashboard
- Digital ID card PDF download
Intentionally does NOT wire email/SMS yet — approve endpoint returns the temp
password once so the admin can share manually until Resend/SendGrid is added.
"""
from __future__ import annotations
import io
import re
import secrets as _sec
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, EmailStr


# ------------------------------------------------------------------ ROLES
ROLES = [
    "super_admin",
    "admin",
    "sales_manager",
    "sales_executive",
    "sales_partner",
    "procurement_partner",
    "franchise_partner",
    "viewer",
]
ROLE_LABEL = {
    "super_admin": "Super Admin",
    "admin": "Admin",
    "sales_manager": "Sales Manager",
    "sales_executive": "Sales Executive",
    "sales_partner": "Sales Partner",
    "procurement_partner": "Procurement Partner",
    "franchise_partner": "Franchise Partner",
    "viewer": "Viewer",
}
ROLE_PREFIX = {
    "super_admin": "SA",
    "admin": "AD",
    "sales_manager": "SM",
    "sales_executive": "SE",
    "sales_partner": "SP",
    "procurement_partner": "PP",
    "franchise_partner": "FP",
    "viewer": "VR",
}
ADMIN_ROLES = {"super_admin", "admin"}


# ------------------------------------------------------------------ MODELS
class PartnerRegisterIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Personal
    full_name: str
    gender: str = ""
    dob: str = ""           # ISO YYYY-MM-DD
    aadhaar: str = ""
    pan: str = ""
    photo: Optional[str] = None
    # Contact
    mobile: str
    alt_mobile: str = ""
    email: EmailStr
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    # Professional
    role: str                 # requested role
    department: str = ""
    territory: str = ""
    working_area: str = ""
    languages: List[str] = []
    previous_experience: str = ""
    linkedin: str = ""
    resume: Optional[str] = None
    pan_doc: Optional[str] = None
    aadhaar_doc: Optional[str] = None
    # Bank
    account_holder: str = ""
    account_number: str = ""
    ifsc: str = ""
    bank_name: str = ""
    upi_id: str = ""
    # Emergency
    emergency_name: str = ""
    emergency_phone: str = ""
    emergency_relation: str = ""


class PartnerDecisionIn(BaseModel):
    reason: str = ""


# ------------------------------------------------------------------ HELPERS
def _now():
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def _next_seq(db, key: str, start: int = 1) -> int:
    doc = await db.opms_counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    if not doc:
        doc = {"_id": key, "seq": start}
        await db.opms_counters.insert_one(doc)
    return int(doc.get("seq", start))


def _mask(val: str, keep: int = 4) -> str:
    if not val:
        return ""
    v = str(val)
    if len(v) <= keep:
        return "*" * len(v)
    return "*" * (len(v) - keep) + v[-keep:]


def _serialize_partner(p: dict, redact_sensitive: bool = False) -> dict:
    if not p:
        return p
    out = dict(p)
    out["id"] = str(out.pop("_id"))
    if redact_sensitive:
        # Never send full Aadhaar/PAN/account numbers to non-admin viewers.
        if out.get("aadhaar"):
            out["aadhaar"] = _mask(out["aadhaar"])
        if out.get("pan"):
            out["pan"] = _mask(out["pan"])
        if out.get("account_number"):
            out["account_number"] = _mask(out["account_number"], 4)
    return out


async def _current_admin(request: Request):
    """Wrapped in a lambda inside the router — see build_opms_router."""
    raise NotImplementedError


async def _upload_partner_file(storage_put, storage_path_builder, images_dir,
                               partner_id: str, kind: str, upload: UploadFile) -> str:
    """Persist an uploaded partner document. Returns the filename."""
    if kind not in {"photo", "resume", "pan_doc", "aadhaar_doc"}:
        raise HTTPException(400, "Invalid document kind")
    raw = await upload.read()
    if not raw:
        raise HTTPException(400, "Empty file")
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8MB)")
    ct = (upload.content_type or "").lower()
    if kind == "resume":
        allowed = {"application/pdf", "application/msword",
                   "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        ext = "pdf" if ct == "application/pdf" else ("docx" if "wordprocessingml" in ct else "doc")
    else:
        allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
        ext = "jpg"
    if ct not in allowed:
        raise HTTPException(400, f"Unsupported file type for {kind}")
    fname = f"partner_{partner_id}_{kind}_{_sec.token_hex(4)}.{ext}"
    # Try object storage first; also drop a local disk copy for dev fallback.
    try:
        storage_put(storage_path_builder(fname), raw, ct)
    except Exception:
        pass
    try:
        (images_dir / fname).write_bytes(raw)
    except Exception:
        pass
    return fname


# ------------------------------------------------------------------ ID CARD PDF
def _build_id_card_pdf(partner: dict, image_bytes: Optional[bytes]) -> bytes:
    """Business-card sized (85.6 × 54 mm) PDF ID card."""
    import qrcode
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.utils import ImageReader

    W, H = 85.6 * mm, 54 * mm
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=landscape((W, H)))
    # Landscape swap: reportlab treats first tuple element as width
    c.setPageSize((W, H))

    NAVY = colors.HexColor("#0F172A")
    GOLD = colors.HexColor("#B8860B")
    INK = colors.HexColor("#111827")
    MUTED = colors.HexColor("#6B7280")

    # Border + header band
    c.setFillColor(NAVY)
    c.rect(0, H - 12 * mm, W, 12 * mm, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 13 * mm, W, 1 * mm, fill=1, stroke=0)

    # Wordmark
    c.setFillColor(colors.white)
    try:
        c.setFont("Helvetica-Bold", 16)
    except Exception:
        c.setFont("Helvetica-Bold", 16)
    c.drawString(6 * mm, H - 8.5 * mm, "ONCOST")
    c.setFont("Helvetica", 6)
    c.drawString(6 * mm, H - 11 * mm, "Corporate Gifting  ·  Brassware")

    # Photo box (left)
    photo_x, photo_y, photo_w, photo_h = 6 * mm, 8 * mm, 20 * mm, 24 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.rect(photo_x, photo_y, photo_w, photo_h, fill=0, stroke=1)
    if image_bytes:
        try:
            c.drawImage(ImageReader(io.BytesIO(image_bytes)),
                        photo_x + 0.4 * mm, photo_y + 0.4 * mm,
                        width=photo_w - 0.8 * mm, height=photo_h - 0.8 * mm,
                        preserveAspectRatio=True, anchor="c", mask="auto")
        except Exception:
            pass
    else:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6)
        c.drawCentredString(photo_x + photo_w / 2, photo_y + photo_h / 2, "PHOTO")

    # Text block (middle)
    tx = photo_x + photo_w + 4 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(tx, H - 18 * mm, (partner.get("full_name") or "")[:30].upper())
    c.setFont("Helvetica", 6.5)
    c.setFillColor(MUTED)
    c.drawString(tx, H - 21 * mm, ROLE_LABEL.get(partner.get("role"), partner.get("role", "")))

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(tx, H - 25.5 * mm, "EMP ID")
    c.drawString(tx, H - 30 * mm, "CODE")
    c.drawString(tx, H - 34.5 * mm, "JOINED")

    c.setFont("Helvetica", 7.5)
    c.drawString(tx + 12 * mm, H - 25.5 * mm, partner.get("employee_id", "-"))
    c.drawString(tx + 12 * mm, H - 30 * mm, partner.get("partner_code", "-"))
    joined = partner.get("joining_date", "")
    if joined:
        try:
            joined = joined.split("T")[0]
        except Exception:
            pass
    c.drawString(tx + 12 * mm, H - 34.5 * mm, joined or "-")

    # Emergency contact (compact)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5.5)
    ec = partner.get("emergency_name") or ""
    ep = partner.get("emergency_phone") or ""
    if ec or ep:
        c.drawString(tx, H - 39.5 * mm, f"Emergency: {ec} · {ep}"[:60])

    # Validity
    validity = partner.get("card_valid_until") or ""
    if validity:
        try:
            validity = validity.split("T")[0]
        except Exception:
            pass
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 5.5)
    c.drawString(tx, H - 43 * mm, f"VALID UNTIL  {validity or '—'}")

    # QR (right)
    qr_size = 20 * mm
    qr_x = W - qr_size - 5 * mm
    qr_y = 8 * mm
    qr_payload = "|".join([
        "ONCOST-EMP",
        partner.get("employee_id", ""),
        partner.get("partner_code", ""),
        (partner.get("mobile") or ""),
    ])
    qr_img = qrcode.make(qr_payload)
    qbuf = io.BytesIO()
    qr_img.save(qbuf, format="PNG")
    c.drawImage(ImageReader(io.BytesIO(qbuf.getvalue())), qr_x, qr_y, qr_size, qr_size)

    # Footer band
    c.setFillColor(NAVY)
    c.rect(0, 0, W, 4 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 5)
    c.drawString(3 * mm, 1.5 * mm, "www.oncost.shop  ·  If found, please return to PRAGNA ENTERPRISES")

    c.showPage()
    c.save()
    return buf.getvalue()


# ------------------------------------------------------------------ ROUTER
def build_opms_router(
    db,
    get_current_user,          # server.py's admin auth dependency
    hash_password,
    create_access_token,
    put_object,                # storage.py
    build_storage_path,
    get_object,
    images_dir,
) -> APIRouter:
    r = APIRouter()

    # ---------- helpers scoped to db ----------
    async def _admin_only(user=Depends(get_current_user)):
        if user.get("role") not in ADMIN_ROLES:
            raise HTTPException(403, "Admin access required")
        return user

    async def _partner_from_request(request: Request) -> dict:
        """Auth dep that allows ANY approved user (partner or admin). Reuses JWT
        set in the `access_token` cookie / Bearer header."""
        # Delegate to server's get_current_user; then load partner if applicable.
        user = await get_current_user(request)
        return user

    def _gen_ids(seq: int, role: str) -> dict:
        emp_id = f"ONCOST-EMP-{seq:04d}"
        partner_code = f"OC{ROLE_PREFIX.get(role, 'PT')}{seq:04d}"
        ref_code = f"ONCOST{seq % 100:02d}"
        return {"employee_id": emp_id, "partner_code": partner_code, "referral_code": ref_code}

    # ================== PUBLIC REGISTRATION ==================
    @r.post("/partners/register")
    async def register(payload: PartnerRegisterIn):
        if payload.role not in ROLES:
            raise HTTPException(400, "Invalid role")
        if payload.role in ADMIN_ROLES:
            raise HTTPException(400, "Admin roles cannot self-register")
        email = payload.email.lower().strip()
        if await db.partners.find_one({"email": email, "status": {"$in": ["pending", "approved"]}}):
            raise HTTPException(400, "A partner with this email is already registered")
        if await db.users.find_one({"email": email}):
            raise HTTPException(400, "This email is already in use")
        if not re.fullmatch(r"[0-9+\-\s()]{7,20}", payload.mobile):
            raise HTTPException(400, "Invalid mobile number")
        doc = payload.model_dump()
        doc.update({
            "email": email,
            "status": "pending",
            "employee_id": None,
            "partner_code": None,
            "referral_code": None,
            "joining_date": None,
            "created_at": _iso(_now()),
        })
        res = await db.partners.insert_one(doc)
        return {"id": str(res.inserted_id), "status": "pending"}

    # ================== PARTNER DOC UPLOAD (public, before or during registration) ==================
    @r.post("/partners/upload")
    async def upload_partner_doc(kind: str, file: UploadFile = File(...)):
        # A temp "unassigned" partner id — used only to name the file until registration ties it.
        if kind not in {"photo", "resume", "pan_doc", "aadhaar_doc"}:
            raise HTTPException(400, "Invalid document kind")
        tmp_id = _sec.token_hex(4)
        fname = await _upload_partner_file(put_object, build_storage_path, images_dir,
                                            tmp_id, kind, file)
        return {"filename": fname}

    # ================== ADMIN LIST / DETAIL ==================
    @r.get("/partners")
    async def list_partners(status: Optional[str] = None, role: Optional[str] = None,
                            _user=Depends(_admin_only)):
        q: dict = {}
        if status:
            q["status"] = status
        if role:
            q["role"] = role
        cur = db.partners.find(q).sort("created_at", -1)
        out = []
        for p in await cur.to_list(length=1000):
            out.append(_serialize_partner(p))
        return out

    @r.get("/partners/{pid}")
    async def get_partner(pid: str, _user=Depends(_admin_only)):
        p = await db.partners.find_one({"_id": ObjectId(pid)})
        if not p:
            raise HTTPException(404, "Not found")
        return _serialize_partner(p)

    # ================== APPROVE / REJECT / SUSPEND ==================
    @r.post("/partners/{pid}/approve")
    async def approve(pid: str, _user=Depends(_admin_only)):
        p = await db.partners.find_one({"_id": ObjectId(pid)})
        if not p:
            raise HTTPException(404, "Not found")
        if p.get("status") == "approved":
            raise HTTPException(400, "Already approved")
        # Assign IDs
        seq = await _next_seq(db, "employee")
        role = p.get("role", "sales_partner")
        gen = _gen_ids(seq, role)
        # Guarantee ref-code uniqueness by extending with a hex suffix if collision.
        if await db.partners.find_one({"referral_code": gen["referral_code"]}):
            gen["referral_code"] = f"{gen['referral_code']}{_sec.token_hex(1).upper()}"
        joined = _now()
        valid_until = joined + timedelta(days=365)
        # Create login user
        temp_pw = _sec.token_urlsafe(9)
        user_doc = {
            "email": p["email"],
            "employee_id": gen["employee_id"],
            "password_hash": hash_password(temp_pw),
            "role": role,
            "partner_id": str(p["_id"]),
            "name": p.get("full_name", ""),
            "must_change_password": True,
            "created_at": _iso(joined),
        }
        await db.users.insert_one(user_doc)
        # Update partner
        update = {
            "status": "approved",
            **gen,
            "joining_date": _iso(joined),
            "card_valid_until": _iso(valid_until),
            "approved_at": _iso(joined),
            "approved_by": _user.get("email"),
        }
        await db.partners.update_one({"_id": ObjectId(pid)}, {"$set": update})
        return {**gen, "temp_password": temp_pw, "email": p["email"], "role": role, "joining_date": update["joining_date"]}

    @r.post("/partners/{pid}/reject")
    async def reject(pid: str, payload: PartnerDecisionIn, _user=Depends(_admin_only)):
        res = await db.partners.update_one(
            {"_id": ObjectId(pid)},
            {"$set": {"status": "rejected", "status_reason": payload.reason,
                      "rejected_at": _iso(_now())}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Not found")
        return {"ok": True}

    @r.post("/partners/{pid}/suspend")
    async def suspend(pid: str, payload: PartnerDecisionIn, _user=Depends(_admin_only)):
        p = await db.partners.find_one({"_id": ObjectId(pid)})
        if not p:
            raise HTTPException(404, "Not found")
        new_status = "approved" if p.get("status") == "suspended" else "suspended"
        await db.partners.update_one(
            {"_id": ObjectId(pid)},
            {"$set": {"status": new_status, "status_reason": payload.reason,
                      "suspended_at": _iso(_now()) if new_status == "suspended" else None}},
        )
        return {"status": new_status}

    # ================== ID CARD PDF ==================
    @r.get("/partners/{pid}/id-card.pdf")
    async def id_card(pid: str, _user=Depends(_admin_only)):
        p = await db.partners.find_one({"_id": ObjectId(pid)})
        if not p:
            raise HTTPException(404, "Not found")
        if p.get("status") != "approved":
            raise HTTPException(400, "ID card is only available for approved partners")
        image_bytes = None
        photo = p.get("photo")
        if photo:
            try:
                image_bytes = get_object(build_storage_path(photo))
            except Exception:
                try:
                    image_bytes = (images_dir / photo).read_bytes()
                except Exception:
                    image_bytes = None
        pdf = _build_id_card_pdf(_serialize_partner(p), image_bytes)
        return StreamingResponse(
            io.BytesIO(pdf),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="ONCOST-IDCARD-{p.get("employee_id", "PARTNER")}.pdf"'},
        )

    # ================== PARTNER: /me + /dashboard ==================
    @r.get("/partner/me")
    async def partner_me(request: Request):
        user = await get_current_user(request)
        role = user.get("role", "")
        pid = user.get("partner_id")
        out = {"user": user, "partner": None}
        if pid:
            p = await db.partners.find_one({"_id": ObjectId(pid)})
            if p:
                out["partner"] = _serialize_partner(p, redact_sensitive=True)
        out["role_label"] = ROLE_LABEL.get(role, role)
        return out

    @r.get("/partner/dashboard")
    async def partner_dashboard(request: Request):
        user = await get_current_user(request)
        pid = user.get("partner_id")
        # MVP-1 numbers: leads / sales / commission all zero until modules land.
        return {
            "totals": {
                "total_leads": 0,
                "assigned_leads": 0,
                "closed_leads": 0,
                "sales_month": 0,
                "sales_year": 0,
                "commission_earned": 0,
                "commission_pending": 0,
                "monthly_target": 0,
            },
            "leaderboard_rank": None,
            "upcoming_followups": [],
            "notifications": [
                {"kind": "welcome", "title": "Welcome to ONCOST", "body": "Your partner portal is ready. Leads and commission tracking modules will be enabled soon."}
            ],
            "partner_id": pid,
        }

    return r


# ------------------------------------------------------------------ STARTUP HOOK
async def ensure_indexes(db):
    """Called from server.py startup. Idempotent."""
    await db.partners.create_index("email")
    await db.partners.create_index("employee_id")
    await db.partners.create_index("partner_code")
    await db.partners.create_index("referral_code", unique=True, sparse=True)
    await db.users.create_index("employee_id", sparse=True)
