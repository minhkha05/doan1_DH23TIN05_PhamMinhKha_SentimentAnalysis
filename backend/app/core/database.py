"""
Async SQLAlchemy engine & session factory for PostgreSQL.
"""

import logging
import ssl
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

_parsed_db_url = urlsplit(settings.DATABASE_URL)
_db_host = _parsed_db_url.hostname or "unknown-host"
_db_port = _parsed_db_url.port or "?"
_db_name = _parsed_db_url.path.lstrip("/") or "unknown-db"
logger.info("Initializing DB engine for %s:%s/%s", _db_host, _db_port, _db_name)

_is_supabase = "supabase" in _db_host or _db_port == 6543

_engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

_connect_args = {}

if _is_supabase:
    # PgBouncer (Supabase pooler) is safest with disabled prepared statement caches.
    _connect_args = {
        "ssl": ssl.create_default_context(),
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
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
