"""OPMS Commission Engine.
- Admin-editable Commission Rules (no code changes needed to modify percentages).
- Auto-calculates a commission record on Quotation → Sale acceptance if a partner
  is attributed to the quote.
- Payment tracker: mark commission as paid with UTR / reference / remarks.
- Partner view: read-only ledger of their own commissions.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict


ADMIN_ROLES = {"super_admin", "admin"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


# ------------------------------------------------------------------ MODELS
class CommissionRuleIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    applies_to_role: Optional[str] = None           # None = any role
    applies_to_category_id: Optional[str] = None    # None = any category
    partner_user_id: Optional[str] = None           # None = any partner (or a specific one)
    min_order_value: float = 0
    max_order_value: Optional[float] = None
    commission_percent: float                        # 0-100
    priority: int = 0                                # higher wins on tie
    active: bool = True


class CommissionRulePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    applies_to_role: Optional[str] = None
    applies_to_category_id: Optional[str] = None
    partner_user_id: Optional[str] = None
    min_order_value: Optional[float] = None
    max_order_value: Optional[float] = None
    commission_percent: Optional[float] = None
    priority: Optional[int] = None
    active: Optional[bool] = None


class CommissionPayIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_reference: str = ""
    utr_number: str = ""
    remarks: str = ""


# ------------------------------------------------------------------ SERIALIZERS
def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    return d


# ------------------------------------------------------------------ MATCHING
async def _partner_role(db, user_id: str) -> Optional[str]:
    if not user_id:
        return None
    try:
        u = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    return u.get("role") if u else None


async def _sale_category_ids(db, sale_doc: dict) -> List[str]:
    """Return the distinct category_ids of products in this sale."""
    pids = [i.get("product_id") for i in sale_doc.get("items", []) if i.get("product_id")]
    if not pids:
        return []
    try:
        obj_ids = [ObjectId(p) for p in pids]
    except Exception:
        return []
    cur = db.products.find({"_id": {"$in": obj_ids}}, {"category_id": 1})
    return list({p.get("category_id") for p in await cur.to_list(length=1000) if p.get("category_id")})


async def find_matching_rule(db, *, order_amount: float, partner_user_id: str,
                             category_ids: List[str]) -> Optional[dict]:
    """Return the highest-priority active rule whose constraints all match; None if none match."""
    partner_role = await _partner_role(db, partner_user_id)
    cur = db.commission_rules.find({"active": True}).sort([("priority", -1)])
    for rule in await cur.to_list(length=500):
        if rule.get("applies_to_role") and rule["applies_to_role"] != partner_role:
            continue
        if rule.get("partner_user_id") and rule["partner_user_id"] != partner_user_id:
            continue
        if rule.get("applies_to_category_id"):
            if rule["applies_to_category_id"] not in (category_ids or []):
                continue
        mn = float(rule.get("min_order_value") or 0)
        mx = rule.get("max_order_value")
        if order_amount < mn:
            continue
        if mx is not None and order_amount > float(mx):
            continue
        return rule
    return None


async def create_commission_for_sale(db, *, sale_id: str, sale_doc: dict) -> Optional[dict]:
    """Called from server.py after a sale is created. Returns the commission doc or None."""
    partner_user_id = sale_doc.get("partner_user_id")
    if not partner_user_id:
        return None
    order_amount = float(sale_doc.get("total") or 0)
    category_ids = await _sale_category_ids(db, sale_doc)
    rule = await find_matching_rule(
        db,
        order_amount=order_amount,
        partner_user_id=partner_user_id,
        category_ids=category_ids,
    )
    if not rule:
        return None
    pct = float(rule.get("commission_percent") or 0)
    amount = round(order_amount * pct / 100.0, 2)
    partner = await db.users.find_one({"_id": ObjectId(partner_user_id)})
    doc = {
        "sale_id": sale_id,
        "quotation_id": sale_doc.get("quotation_id"),
        "customer_name": sale_doc.get("customer_name"),
        "customer_company": sale_doc.get("customer_company"),
        "partner_user_id": partner_user_id,
        "partner_name": (partner or {}).get("name") or (partner or {}).get("email"),
        "partner_employee_id": (partner or {}).get("employee_id"),
        "partner_role": (partner or {}).get("role"),
        "rule_id": str(rule["_id"]),
        "rule_name": rule.get("name"),
        "order_amount": order_amount,
        "commission_percent": pct,
        "commission_amount": amount,
        "status": "pending",
        "created_at": _iso(_now()),
        "paid_at": None,
        "payment_reference": None,
        "utr_number": None,
        "remarks": None,
    }
    res = await db.commissions.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


# ------------------------------------------------------------------ ROUTER
def build_commissions_router(db, get_current_user) -> APIRouter:
    r = APIRouter()

    async def _admin_only(user=Depends(get_current_user)):
        if user.get("role") not in ADMIN_ROLES:
            raise HTTPException(403, "Admin access required")
        return user

    # ============= RULES =============
    @r.post("/commission-rules")
    async def create_rule(payload: CommissionRuleIn, _user=Depends(_admin_only)):
        doc = payload.model_dump()
        doc["name"] = (doc.get("name") or "").strip() or "Untitled rule"
        if doc["commission_percent"] < 0 or doc["commission_percent"] > 100:
            raise HTTPException(400, "commission_percent must be 0-100")
        doc["created_at"] = _iso(_now())
        res = await db.commission_rules.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc.pop("_id", None)
        return doc

    @r.get("/commission-rules")
    async def list_rules(_user=Depends(_admin_only)):
        cur = db.commission_rules.find({}).sort([("priority", -1), ("created_at", -1)])
        return [_serialize(x) for x in await cur.to_list(length=500)]

    @r.put("/commission-rules/{rid}")
    async def update_rule(rid: str, payload: CommissionRulePatch, _user=Depends(_admin_only)):
        update = payload.model_dump(exclude_unset=True)
        if not update:
            raise HTTPException(400, "No fields to update")
        if "commission_percent" in update and (update["commission_percent"] < 0 or update["commission_percent"] > 100):
            raise HTTPException(400, "commission_percent must be 0-100")
        res = await db.commission_rules.update_one({"_id": ObjectId(rid)}, {"$set": update})
        if res.matched_count == 0:
            raise HTTPException(404, "Rule not found")
        doc = await db.commission_rules.find_one({"_id": ObjectId(rid)})
        return _serialize(doc)

    @r.delete("/commission-rules/{rid}")
    async def delete_rule(rid: str, _user=Depends(_admin_only)):
        res = await db.commission_rules.delete_one({"_id": ObjectId(rid)})
        if res.deleted_count == 0:
            raise HTTPException(404, "Rule not found")
        return {"ok": True}

    # ============= COMMISSIONS =============
    @r.get("/commissions")
    async def list_commissions(status: Optional[str] = None, request: Request = None):
        user = await get_current_user(request)
        q: dict = {}
        if status:
            q["status"] = status
        if user.get("role") not in ADMIN_ROLES:
            q["partner_user_id"] = user.get("id")
        cur = db.commissions.find(q).sort([("created_at", -1)])
        return [_serialize(x) for x in await cur.to_list(length=2000)]

    @r.get("/commissions/summary")
    async def summary(request: Request = None):
        user = await get_current_user(request)
        base: dict = {}
        if user.get("role") not in ADMIN_ROLES:
            base["partner_user_id"] = user.get("id")
        pending_cur = db.commissions.find({**base, "status": "pending"})
        paid_cur = db.commissions.find({**base, "status": "paid"})
        pending = await pending_cur.to_list(length=5000)
        paid = await paid_cur.to_list(length=5000)
        return {
            "pending_count": len(pending),
            "pending_amount": round(sum(float(x.get("commission_amount") or 0) for x in pending), 2),
            "paid_count": len(paid),
            "paid_amount": round(sum(float(x.get("commission_amount") or 0) for x in paid), 2),
            "total_amount": round(sum(float(x.get("commission_amount") or 0) for x in pending + paid), 2),
        }

    @r.get("/commissions/{cid}")
    async def get_commission(cid: str, request: Request):
        user = await get_current_user(request)
        c = await db.commissions.find_one({"_id": ObjectId(cid)})
        if not c:
            raise HTTPException(404, "Commission not found")
        if user.get("role") not in ADMIN_ROLES and c.get("partner_user_id") != user.get("id"):
            raise HTTPException(403, "Forbidden")
        return _serialize(c)

    @r.post("/commissions/{cid}/pay")
    async def mark_paid(cid: str, payload: CommissionPayIn, _user=Depends(_admin_only)):
        c = await db.commissions.find_one({"_id": ObjectId(cid)})
        if not c:
            raise HTTPException(404, "Commission not found")
        if c.get("status") == "paid":
            raise HTTPException(400, "Already paid")
        upd = {
            "status": "paid",
            "paid_at": _iso(_now()),
            "payment_reference": (payload.payment_reference or "").strip(),
            "utr_number": (payload.utr_number or "").strip(),
            "remarks": (payload.remarks or "").strip(),
            "paid_by": _user.get("email"),
        }
        await db.commissions.update_one({"_id": ObjectId(cid)}, {"$set": upd})
        return _serialize(await db.commissions.find_one({"_id": ObjectId(cid)}))

    @r.post("/commissions/{cid}/revert")
    async def revert_payment(cid: str, _user=Depends(_admin_only)):
        """Undo a payment mark (in case of wrong UTR entry)."""
        res = await db.commissions.update_one(
            {"_id": ObjectId(cid), "status": "paid"},
            {"$set": {"status": "pending", "paid_at": None, "payment_reference": None,
                      "utr_number": None, "remarks": None, "paid_by": None}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Paid commission not found")
        return {"ok": True}

    return r


async def ensure_indexes(db):
    await db.commission_rules.create_index([("priority", -1)])
    await db.commissions.create_index("partner_user_id")
    await db.commissions.create_index("status")
    await db.commissions.create_index([("created_at", -1)])
