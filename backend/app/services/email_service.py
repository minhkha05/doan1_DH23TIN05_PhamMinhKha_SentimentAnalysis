"""
Email service – sends verification codes for password reset.
Uses SMTP (Gmail App Password recommended).
"""

import asyncio
import logging
import random
import string
import ssl
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import get_settings


logger = logging.getLogger(__name__)

# Temporarily disable SMTP attempts after hard network failures (for demo stability).
_smtp_disabled_until: datetime | None = None

# ── In-memory code store (production: use Redis/database) ──
# Key: email, Value: (code, expiry_datetime)
_reset_codes: Dict[str, Tuple[str, datetime]] = {}


def generate_code(length: int = 6) -> str:
    """Generate a random numeric verification code."""
    return ''.join(random.choices(string.digits, k=length))


def store_code(email: str, code: str, ttl_minutes: int = 10):
    """Store verification code with expiry."""
    _reset_codes[email.lower()] = (code, datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes))


def verify_code(email: str, code: str) -> bool:
    """Verify a code. Returns True if valid and not expired."""
    key = email.lower()
    if key not in _reset_codes:
        return False
    stored_code, expiry = _reset_codes[key]
    if datetime.now(timezone.utc) > expiry:
        del _reset_codes[key]
        return False
    if stored_code != code:
        return False
    return True


def consume_code(email: str):
    """Remove code after successful password reset."""
    _reset_codes.pop(email.lower(), None)


def _is_smtp_temporarily_disabled() -> bool:
    global _smtp_disabled_until
    if not _smtp_disabled_until:
        return False

    if datetime.now(timezone.utc) >= _smtp_disabled_until:
        _smtp_disabled_until = None
        return False

    return True


def _disable_smtp_temporarily(minutes: int = 10):
    global _smtp_disabled_until
    _smtp_disabled_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)


def _send_email_sync(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    to_email: str,
    msg: MIMEMultipart,
):
    """Blocking SMTP send operation executed in a worker thread."""
    tls_context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
        server.ehlo()
        server.starttls(context=tls_context)
        server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())


async def _send_email_via_resend(
    to_email: str,
    subject: str,
    html: str,
    from_name: str,
    default_sender: str,
):
    """Send email through Resend API over HTTPS (port 443)."""
    settings = get_settings()
    api_key = (settings.RESEND_API_KEY or "").strip()
    from_email = (settings.RESEND_FROM_EMAIL or default_sender or "").strip()

    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured.")
    if not from_email:
        raise RuntimeError("RESEND_FROM_EMAIL (or SMTP_USER) is required for Resend provider.")

    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    timeout = httpx.Timeout(connect=8.0, read=12.0, write=12.0, pool=8.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post("https://api.resend.com/emails", json=payload, headers=headers)

    if resp.status_code not in (200, 202):
        raise RuntimeError(f"Resend API failed: status={resp.status_code}, body={resp.text}")


async def send_reset_email(to_email: str, code: str):
    """
    Send password reset verification code via configured provider.

    Supports two providers:
      - SMTP (default): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME
      - Resend API: EMAIL_PROVIDER=resend|auto, RESEND_API_KEY, RESEND_FROM_EMAIL
    """
    settings = get_settings()
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    from_name = settings.SMTP_FROM_NAME
    provider = (settings.EMAIL_PROVIDER or "auto").strip().lower()
    if provider not in {"smtp", "resend", "auto"}:
        logger.warning("Unknown EMAIL_PROVIDER=%s. Falling back to auto.", provider)
        provider = "auto"

    smtp_available = bool(smtp_user and smtp_password)
    resend_available = bool((settings.RESEND_API_KEY or "").strip())

    subject = f"[SentimentAI] Mã xác thực đặt lại mật khẩu: {code}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email

    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #6366f1; margin: 0;">SentimentAI</h2>
            <p style="color: #64748b; font-size: 14px;">Phân tích cảm xúc bằng AI</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
            <p style="color: #334155; font-size: 15px; margin-bottom: 16px;">
                Mã xác thực đặt lại mật khẩu của bạn:
            </p>
            <div style="background: #6366f1; color: white; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block;">
                {code}
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">
                Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với ai.
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    async def _print_fallback_code():
        # Console fallback for debug/dev when external providers fail.
        print(f"RESET CODE for {to_email}: {code}")

    if provider == "resend":
        try:
            await _send_email_via_resend(to_email, subject, html, from_name, smtp_user)
            logger.info("Password reset email sent via Resend to %s", to_email)
            return
        except Exception as e:
            logger.error("Resend send failed for %s: %s", to_email, e)
            await _print_fallback_code()
            return

    smtp_temporarily_disabled = _is_smtp_temporarily_disabled()
    if smtp_available and not smtp_temporarily_disabled:
        try:
            await asyncio.wait_for(
                asyncio.to_thread(
                    _send_email_sync,
                    smtp_host,
                    smtp_port,
                    smtp_user,
                    smtp_password,
                    to_email,
                    msg,
                ),
                timeout=10,
            )
            logger.info("Password reset email sent successfully to %s", to_email)
            return
        except OSError as e:
            logger.error("SMTP send failed for %s: %s", to_email, e)
            if getattr(e, "errno", None) == 101:
                _disable_smtp_temporarily(minutes=15)
                logger.warning("SMTP disabled for 15 minutes due to network unreachable (Errno 101).")
        except Exception as e:
            logger.error("SMTP send failed for %s: %s", to_email, e)
    elif smtp_temporarily_disabled:
        logger.warning("Skipping SMTP attempt because it is temporarily disabled after recent network failures.")
    elif provider == "smtp":
        logger.error("SMTP provider selected but SMTP_USER/SMTP_PASSWORD is not configured.")

    if resend_available and provider in {"auto", "smtp"}:
        try:
            await _send_email_via_resend(to_email, subject, html, from_name, smtp_user)
            logger.info("Password reset email sent via Resend fallback to %s", to_email)
            return
        except Exception as e:
            logger.error("Resend fallback failed for %s: %s", to_email, e)

    await _print_fallback_code()
