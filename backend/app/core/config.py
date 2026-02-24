"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/sentiment_db"

    # ── JWT Authentication ────────────────────────────────
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

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

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance – read .env once."""
    return Settings()
