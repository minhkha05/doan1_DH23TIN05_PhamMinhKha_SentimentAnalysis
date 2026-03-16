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
    expose_headers=[
        "Content-Disposition",
        "X-Export-Id",
        "X-Export-File",
        "X-Export-Rows",
    ],
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


# ══════════════════════════════════════════════════════════
# Phục vụ Frontend (Giao diện React tĩnh)
# ══════════════════════════════════════════════════════════

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException

# Xác định đường dẫn thư mục frontend đã build
frontend_build_path = os.path.join(os.path.dirname(__file__), "../../frontend/dist")

if os.path.exists(frontend_build_path):
    # Phục vụ các file tĩnh (js, css, hình ảnh) từ thư mục assets
    assets_path = os.path.join(frontend_build_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
        
    # Public root file tĩnh khác ví dụ như vite.svg, favicon
    @app.get("/{file_name:path}", include_in_schema=False)
    async def serve_static_root(file_name: str):
        # Bỏ qua các API route và Swagger Docs
        if file_name.startswith("api/") or file_name in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(frontend_build_path, file_name)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Với các route của React Router không khớp file nào, trả về index.html
        index_file = os.path.join(frontend_build_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        
        raise HTTPException(status_code=404, detail="Not Found")

