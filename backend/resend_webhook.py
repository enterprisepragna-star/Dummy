"""Resend webhook receiver.

Resend uses Svix under the hood. We verify each incoming payload against the
`RESEND_WEBHOOK_SECRET` (in the form `whsec_<base64>`) using the Svix header
convention: `svix-id`, `svix-timestamp`, `svix-signature`.

Events are stored in the `email_events` collection so the admin console can
show delivery status per email.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("resend.webhook")

REPLAY_TOLERANCE_SEC = 300  # 5 min per Svix spec


def _secret_bytes() -> Optional[bytes]:
    raw = (os.environ.get("RESEND_WEBHOOK_SECRET") or "").strip()
    if not raw:
        return None
    body = raw.split("_", 1)[1] if raw.startswith("whsec_") else raw
    try:
        return base64.b64decode(body)
    except Exception:
        return None


def _verify(svix_id: str, svix_timestamp: str, svix_signature: str,
            raw_body: bytes, secret: bytes) -> bool:
    signed = f"{svix_id}.{svix_timestamp}.".encode("utf-8") + raw_body
    expected = hmac.new(secret, signed, hashlib.sha256).digest()
    expected_b64 = base64.b64encode(expected).decode("utf-8")
    # Header may hold multiple space-separated `v1,<sig>` (during rotation)
    for token in svix_signature.split():
        if not token.startswith("v1,"):
            continue
        provided = token.split(",", 1)[1]
        if hmac.compare_digest(provided, expected_b64):
            return True
    return False


def build_webhook_router(db) -> APIRouter:
    r = APIRouter()

    @r.post("/webhooks/resend")
    async def resend_webhook(req: Request):
        secret = _secret_bytes()
        if not secret:
            # Never fail closed if the operator hasn't set a secret — accept but flag.
            logger.warning("RESEND_WEBHOOK_SECRET not configured; skipping verification")

        svix_id = req.headers.get("svix-id")
        svix_ts = req.headers.get("svix-timestamp")
        svix_sig = req.headers.get("svix-signature")
        raw_body = await req.body()

        if secret:
            if not (svix_id and svix_ts and svix_sig):
                raise HTTPException(400, "Missing Svix signature headers")
            # Replay protection
            try:
                if abs(time.time() - int(svix_ts)) > REPLAY_TOLERANCE_SEC:
                    raise HTTPException(400, "Timestamp outside tolerance window")
            except ValueError:
                raise HTTPException(400, "Invalid svix-timestamp")
            if not _verify(svix_id, svix_ts, svix_sig, raw_body, secret):
                raise HTTPException(401, "Signature mismatch")

        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except Exception:
            raise HTTPException(400, "Invalid JSON body")

        event_type = payload.get("type") or payload.get("event") or ""
        data = payload.get("data") or {}
        doc = {
            "svix_id": svix_id,
            "svix_timestamp": svix_ts,
            "type": event_type,
            "email_id": data.get("email_id") or data.get("id"),
            "to": data.get("to"),
            "from": data.get("from"),
            "subject": data.get("subject"),
            "created_at": data.get("created_at"),
            "raw": payload,
            "received_at": int(time.time()),
        }
        # Upsert by svix_id so retries don't duplicate.
        if svix_id:
            await db.email_events.update_one(
                {"svix_id": svix_id}, {"$set": doc}, upsert=True,
            )
        else:
            await db.email_events.insert_one(doc)

        return {"ok": True, "type": event_type}

    return r
