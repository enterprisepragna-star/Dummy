"""Thin async wrapper around Resend for transactional emails.
Silently no-ops if RESEND_API_KEY isn't configured — so we never break the flow
just because email isn't set up.
"""
from __future__ import annotations
import asyncio
import logging
import os
from typing import Optional

import resend

logger = logging.getLogger(__name__)

_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
_SENDER = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev").strip()
_SENDER_NAME = os.environ.get("SENDER_NAME", "ONCOST").strip()
_PORTAL_URL = os.environ.get("PORTAL_URL", "").rstrip("/")

if _API_KEY:
    resend.api_key = _API_KEY


def _from_field() -> str:
    return f"{_SENDER_NAME} <{_SENDER}>" if _SENDER_NAME else _SENDER


def is_enabled() -> bool:
    return bool(_API_KEY)


def portal_url(path: str = "") -> str:
    if not _PORTAL_URL:
        return path or "/"
    return _PORTAL_URL + (path if path.startswith("/") else ("/" + path if path else ""))


async def send_email(to: str, subject: str, html: str,
                     reply_to: Optional[str] = None) -> dict:
    """Fire an email in a background thread. Returns {'ok': bool, 'id': str|None}."""
    if not _API_KEY:
        logger.warning("Resend not configured — skipping email to %s", to)
        return {"ok": False, "reason": "resend_not_configured"}
    params = {
        "from": _from_field(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        params["reply_to"] = reply_to
    try:
        res = await asyncio.to_thread(resend.Emails.send, params)
        return {"ok": True, "id": (res or {}).get("id")}
    except Exception as e:
        logger.error("Resend send failed to %s: %s", to, e)
        return {"ok": False, "reason": str(e)}


# ------------------------------------------------------------------ TEMPLATES
def _shell(inner_html: str) -> str:
    """Wrap inner content in a simple table-based email shell."""
    return f"""
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;">
            <tr><td style="background:#0F172A;padding:22px 28px;">
              <div style="color:#ffffff;font-size:22px;letter-spacing:2px;font-weight:bold;">ONCOST</div>
              <div style="color:#B8860B;font-size:11px;margin-top:4px;">CORPORATE GIFTING · BRASSWARE</div>
            </td></tr>
            <tr><td style="padding:28px;color:#111827;font-size:14px;line-height:1.55;">
              {inner_html}
            </td></tr>
            <tr><td style="background:#F4F4F5;padding:16px 28px;color:#6b7280;font-size:11px;">
              PRAGNA ENTERPRISES · Tellapur, Hyderabad, Telangana 500019 · enterprisepragna@gmail.com
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def render_welcome_email(*, name: str, employee_id: str, partner_code: str,
                         referral_code: str, login_email: str, temp_password: str,
                         role_label: str) -> str:
    login_link = portal_url("/login")
    body = f"""
      <p>Hi {name.split(' ')[0] or name},</p>
      <p>Welcome aboard! Your ONCOST partner application has been <b style="color:#059669;">approved</b>.
      You are now onboarded as a <b>{role_label}</b>.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="padding:12px 14px;background:#F9FAFB;border:1px solid #E5E7EB;">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Employee ID</div>
            <div style="font-family:monospace;font-size:15px;margin-top:4px;">{employee_id}</div>
          </td>
          <td style="padding:12px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-left:0;">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6b7280;">Partner Code</div>
            <div style="font-family:monospace;font-size:15px;margin-top:4px;">{partner_code}</div>
          </td>
          <td style="padding:12px 14px;background:#ECFDF5;border:1px solid #A7F3D0;border-left:0;">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#065F46;">Referral Code</div>
            <div style="font-family:monospace;font-size:15px;margin-top:4px;color:#065F46;">{referral_code}</div>
          </td>
        </tr>
      </table>

      <p style="margin-top:24px;"><b>Sign in to your Partner Portal:</b></p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;">Email or Employee ID:</td>
            <td style="padding:8px 0 8px 12px;font-family:monospace;">{login_email}  <span style="color:#6b7280;"> · or ·</span> {employee_id}</td></tr>
        <tr><td style="padding:8px 0;">Temporary Password:</td>
            <td style="padding:8px 0 8px 12px;font-family:monospace;background:#FEF3C7;padding:6px 8px;border:1px solid #FCD34D;">{temp_password}</td></tr>
      </table>

      <p style="margin-top:16px;">
        <a href="{login_link}" style="display:inline-block;background:#002FA7;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:14px;">Open the Partner Portal →</a>
      </p>

      <p style="color:#6b7280;font-size:12px;margin-top:22px;">
        For security, please sign in and change your password on first login. This email contains the only copy
        of your temporary password — treat it as sensitive.
      </p>

      <p style="margin-top:22px;">Cheers,<br/>Team ONCOST</p>
    """
    return _shell(body)


def render_password_reset_email(*, name: str, reset_link: str, expires_hours: int = 24) -> str:
    first = (name or "").split(" ")[0] or "there"
    body = f"""
      <p>Hi {first},</p>
      <p>We received a request to reset the password for your ONCOST account.</p>
      <p>Click the button below to choose a new password. This link is valid for the next
         <b>{expires_hours} hours</b> and can be used only once.</p>

      <p style="margin:22px 0;">
        <a href="{reset_link}"
           style="display:inline-block;background:#002FA7;color:#ffffff;text-decoration:none;
                  padding:12px 22px;font-size:14px;">Reset my password →</a>
      </p>

      <p style="color:#6b7280;font-size:12px;">Button not working? Paste this URL into your browser:</p>
      <p style="font-family:monospace;font-size:12px;word-break:break-all;color:#111827;
                background:#F9FAFB;border:1px solid #E5E7EB;padding:10px;">{reset_link}</p>

      <p style="color:#6b7280;font-size:12px;margin-top:22px;">
        If you did not request this, you can safely ignore this email — your existing password
        will continue to work.
      </p>

      <p style="margin-top:22px;">Team ONCOST</p>
    """
    return _shell(body)


def render_lead_assigned_email(*, name: str, lead: dict, portal_path: str = "/partner/dashboard") -> str:
    link = portal_url(portal_path)
    body = f"""
      <p>Hi {(name or '').split(' ')[0] or 'there'},</p>
      <p>A new lead has been assigned to you.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #E5E7EB;">
        <tr><td style="padding:10px 14px;background:#F9FAFB;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Lead</td>
            <td style="padding:10px 14px;background:#F9FAFB;font-weight:600;">{lead.get('name','—')}</td></tr>
        <tr><td style="padding:10px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Company</td>
            <td style="padding:10px 14px;">{lead.get('company') or '—'}</td></tr>
        <tr><td style="padding:10px 14px;background:#F9FAFB;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Contact</td>
            <td style="padding:10px 14px;background:#F9FAFB;">{lead.get('contact_person') or '—'} · {lead.get('phone') or ''} · {lead.get('email') or ''}</td></tr>
        <tr><td style="padding:10px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Source</td>
            <td style="padding:10px 14px;">{lead.get('source','—')}</td></tr>
      </table>
      <p><a href="{link}" style="display:inline-block;background:#002FA7;color:#ffffff;text-decoration:none;padding:10px 18px;font-size:14px;">Open in Partner Portal →</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:18px;">Please reach out to the contact within 24 hours to maintain conversion targets.</p>
    """
    return _shell(body)
