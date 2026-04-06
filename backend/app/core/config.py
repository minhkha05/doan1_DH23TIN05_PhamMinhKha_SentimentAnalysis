"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""

import logging
import re
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings


logger = logging.getLogger(__name__)
_CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x1f\x7f]")


def _mask_database_url(url: str) -> str:
    """Return a safe representation of DATABASE_URL for logs."""
    parsed = urlsplit(url)
    host = parsed.hostname or "unknown-host"
    port = parsed.port or "?"
    db_name = parsed.path.lstrip("/") or "unknown-db"
    user = parsed.username or "unknown-user"
    return f"{parsed.scheme}://{user}:***@{host}:{port}/{db_name}"


def _sanitize_and_validate_database_url(raw_value: object) -> str:
    """Normalize DATABASE_URL and fail fast on malformed values."""
    if raw_value is None:
        raise ValueError("DATABASE_URL is required.")

    original = str(raw_value)
    cleaned = original.strip().strip('"').strip("'")
    cleaned = _CONTROL_CHAR_PATTERN.sub("", cleaned).strip()

    if cleaned != original:
        logger.warning(
            "DATABASE_URL contained hidden/extra characters and was sanitized before use."
        )

    parsed = urlsplit(cleaned)
    if parsed.scheme != "postgresql+asyncpg":
        raise ValueError("DATABASE_URL must use 'postgresql+asyncpg' scheme.")
    if not parsed.hostname:
        raise ValueError("DATABASE_URL must include a hostname.")

    database_name = parsed.path.lstrip("/")
    if not database_name:
        raise ValueError("DATABASE_URL must include a database name in path.")
    if any(ch.isspace() for ch in database_name):
        raise ValueError(
            "DATABASE_URL database name contains whitespace/newline characters."
        )

    logger.info("DATABASE_URL validated: %s", _mask_database_url(cleaned))
    return cleaned


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/sentiment_db"
    DB_SSL_MODE: Literal["auto", "disable", "require", "verify-full"] = "auto"
    DB_SSL_CA_FILE: str = ""

    # ── JWT Authentication ────────────────────────────────
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Google OAuth ──────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Application ───────────────────────────────────────
    APP_NAME: str = "AI Sentiment Analysis API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── SMTP Email (for password reset) ───────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "SentimentAI"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def sanitize_database_url(cls, value: object) -> str:
        return _sanitize_and_validate_database_url(value)

    @field_validator("DB_SSL_MODE", mode="before")
    @classmethod
    def normalize_db_ssl_mode(cls, value: object) -> str:
        return str(value).strip().lower()

    @field_validator("DB_SSL_CA_FILE", mode="before")
    @classmethod
    def normalize_db_ssl_ca_file(cls, value: object) -> str:
        return str(value).strip().strip('"').strip("'")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance – read .env once."""
    return Settings()
