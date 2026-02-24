"""
FastAPI Application Entry Point.
Assembles routers, exception handlers, CORS, and lifespan events.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.routers import admin, auth, user

settings = get_settings()


# ══════════════════════════════════════════════════════════
# Lifespan Events
# ══════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / Shutdown events."""
    # ── Startup ───────────────────────────────────────────
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📦 Database: {settings.DATABASE_URL.split('@')[-1]}")
    yield
    # ── Shutdown ──────────────────────────────────────────
    print("🛑 Shutting down...")


# ══════════════════════════════════════════════════════════
# Create FastAPI App
# ══════════════════════════════════════════════════════════

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API hệ thống phân tích cảm xúc tiếng Việt sử dụng AI.\n\n"
        "**Tính năng:**\n"
        "- 🔐 Đăng ký / Đăng nhập (JWT)\n"
        "- 📝 Phân tích cảm xúc văn bản\n"
        "- 📊 Dashboard thống kê (Admin)\n"
        "- 🏷️ Sửa nhãn cảm xúc (Admin)\n"
        "- 📤 Xuất dữ liệu thông minh (Admin)\n"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ══════════════════════════════════════════════════════════
# CORS Middleware
# ══════════════════════════════════════════════════════════

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════
# Exception Handlers
# ══════════════════════════════════════════════════════════

register_exception_handlers(app)


# ══════════════════════════════════════════════════════════
# Routers
# ══════════════════════════════════════════════════════════

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(admin.router)


# ══════════════════════════════════════════════════════════
# Health Check
# ══════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def health_check():
    """Root endpoint – API health check."""
    return {
        "success": True,
        "message": f"{settings.APP_NAME} is running!",
        "version": settings.APP_VERSION,
    }


@app.get("/health", tags=["Health"])
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
