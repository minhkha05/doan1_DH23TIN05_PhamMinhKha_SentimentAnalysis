"""
Email service – sends verification codes for password reset.
Uses SMTP (Gmail App Password recommended).
"""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import get_settings

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


async def send_reset_email(to_email: str, code: str):
    """
    Send password reset verification code via SMTP.
    
    Requires these env vars:
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME
    """
    settings = get_settings()
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    from_name = settings.SMTP_FROM_NAME

    if not smtp_user or not smtp_password:
        # Fallback: just log to console in dev mode
        print(f"\n{'='*50}")
        print(f"RESET CODE for {to_email}: {code}")
        print(f"{'='*50}\n")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[SentimentAI] Mã xác thực đặt lại mật khẩu: {code}"
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

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        # Still print code to console as fallback
        print(f"📧 RESET CODE for {to_email}: {code}")
