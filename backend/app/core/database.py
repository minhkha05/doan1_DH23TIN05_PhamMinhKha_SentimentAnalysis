"""
Async SQLAlchemy engine & session factory for PostgreSQL.
"""

import logging
import ssl
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)
_LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1"}

_parsed_db_url = urlsplit(settings.DATABASE_URL)
_db_host = _parsed_db_url.hostname or "unknown-host"
_db_port = _parsed_db_url.port or "?"
_db_name = _parsed_db_url.path.lstrip("/") or "unknown-db"
logger.info("Initializing DB engine for %s:%s/%s", _db_host, _db_port, _db_name)

_is_supabase = "supabase" in _db_host or _db_port == 6543


def _is_local_host(host: str) -> bool:
    return host.lower() in _LOCAL_DB_HOSTS


def _resolve_ssl_mode() -> str:
    if settings.DB_SSL_MODE != "auto":
        return settings.DB_SSL_MODE

    if _is_local_host(_db_host):
        return "disable"

    # Supabase pooler commonly works best with encrypted TLS without strict cert verification.
    if _is_supabase:
        return "require"

    return "verify-full"


def _build_ssl_context(effective_ssl_mode: str) -> ssl.SSLContext | None:
    if effective_ssl_mode == "disable":
        return None

    if effective_ssl_mode == "require":
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        logger.warning(
            "DB SSL mode=require: TLS enabled without certificate verification. "
            "Use verify-full in environments with trusted CA chain."
        )
        return ctx

    # verify-full
    ctx = ssl.create_default_context()
    if settings.DB_SSL_CA_FILE:
        ca_file = Path(settings.DB_SSL_CA_FILE)
        if not ca_file.exists():
            raise ValueError(f"DB_SSL_CA_FILE not found: {ca_file}")
        ctx.load_verify_locations(cafile=str(ca_file))
        logger.info("Loaded DB SSL CA file from %s", ca_file)
    return ctx


_effective_ssl_mode = _resolve_ssl_mode()
logger.info(
    "Database SSL mode resolved: configured=%s, effective=%s",
    settings.DB_SSL_MODE,
    _effective_ssl_mode,
)

if _effective_ssl_mode == "disable" and not _is_local_host(_db_host):
    logger.warning("DB_SSL_MODE=disable on non-local host %s. Traffic may be unencrypted.", _db_host)

_engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

_connect_args = {}

_ssl_context = _build_ssl_context(_effective_ssl_mode)
if _ssl_context is not None:
    _connect_args["ssl"] = _ssl_context

if _is_supabase:
    # PgBouncer (Supabase pooler) is safest with disabled prepared statement caches.
    _connect_args["statement_cache_size"] = 0
    _connect_args["prepared_statement_cache_size"] = 0
    _engine_kwargs["poolclass"] = NullPool
    logger.info("Supabase mode enabled: using NullPool and disabled asyncpg statement caches.")
else:
    _engine_kwargs["pool_size"] = 20
    _engine_kwargs["max_overflow"] = 10

if _connect_args:
    _engine_kwargs["connect_args"] = _connect_args

# ── Async Engine ──────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    **_engine_kwargs,
)

# ── Session Factory ───────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Base Model ────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ── Dependency ────────────────────────────────────────────
async def get_db() -> AsyncSession:
    """Yield an async database session, auto-close on exit."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
