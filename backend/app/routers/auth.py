"""
Auth router – /api/v1/auth
Endpoints: register, login, profile, forgot-password, verify-reset-code, reset-password
"""

import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password
from app.dependencies import get_current_user
from app.models.models import TaiKhoan
from app.schemas.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SuccessResponse,
    TokenResponse,
    UserProfile,
    VerifyResetCodeRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


def _is_local_host(host: str) -> bool:
    host = host.lower()
    return host.startswith("localhost") or host.startswith("127.0.0.1")


def _resolve_google_redirect_uri(settings, request: Request) -> str:
    configured = (settings.GOOGLE_REDIRECT_URI or "").strip()
    req_host = (request.headers.get("x-forwarded-host") or request.url.netloc or "").strip()
    req_scheme = (request.headers.get("x-forwarded-proto") or request.url.scheme or "https").strip()
    runtime_redirect = f"{req_scheme}://{req_host}/api/v1/auth/google/callback"
    configured_host = (httpx.URL(configured).host or "") if configured else ""

    if not configured:
        logger.warning("GOOGLE_REDIRECT_URI not set, using runtime redirect URI: %s", runtime_redirect)
        return runtime_redirect

    if req_host and not _is_local_host(req_host) and _is_local_host(configured_host):
        logger.warning(
            "GOOGLE_REDIRECT_URI points to localhost while running on host=%s; using runtime redirect URI.",
            req_host,
        )
        return runtime_redirect

    return configured


# ══════════════════════════════════════════════════════════
# POST /register
# ══════════════════════════════════════════════════════════

@router.post(
    "/register",
    response_model=SuccessResponse,
    status_code=201,
    summary="Đăng ký tài khoản mới",
    description="Tạo tài khoản bằng email hoặc số điện thoại.",
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.register(
        email=body.email,
        sdt=body.sdt,
        matkhau=body.matkhau,
    )
    return SuccessResponse(
        message="Đăng ký thành công.",
        data={
            "tk_id": user.tk_id,
            "email": user.tk_email,
            "sdt": user.tk_sdt,
            "vaitro": user.tk_vaitro.value,
        },
    )


# ══════════════════════════════════════════════════════════
# POST /login
# ══════════════════════════════════════════════════════════

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Đăng nhập",
    description="Đăng nhập bằng email hoặc SĐT, nhận JWT token.",
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.login(
        email=body.email,
        sdt=body.sdt,
        matkhau=body.matkhau,
    )
    return TokenResponse(**result)


# ══════════════════════════════════════════════════════════
# GET /profile
# ══════════════════════════════════════════════════════════

@router.get(
    "/profile",
    response_model=UserProfile,
    summary="Thông tin tài khoản",
    description="Lấy thông tin tài khoản hiện tại (yêu cầu JWT).",
)
async def get_profile(
    current_user: TaiKhoan = Depends(get_current_user),
):
    return UserProfile.model_validate(current_user)


# ══════════════════════════════════════════════════════════
# POST /forgot-password
# ══════════════════════════════════════════════════════════

@router.post(
    "/forgot-password",
    summary="Gửi mã xác thực qua email",
    description="Gửi mã 6 số đến email để đặt lại mật khẩu.",
)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    from app.services.email_service import generate_code, store_code, send_reset_email

    email = body.email.strip().lower()

    # Check if email exists in database
    result = await db.execute(sa_select(TaiKhoan).where(TaiKhoan.tk_email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản với email này.")

    code = generate_code()
    store_code(email, code)
    await send_reset_email(email, code)

    return {"message": "Mã xác thực đã được gửi."}


# ══════════════════════════════════════════════════════════
# POST /verify-reset-code
# ══════════════════════════════════════════════════════════

@router.post(
    "/verify-reset-code",
    summary="Xác thực mã reset",
    description="Kiểm tra mã xác thực có hợp lệ không.",
)
async def verify_reset_code(body: VerifyResetCodeRequest):
    from app.services.email_service import verify_code as check_code

    email = body.email.strip().lower()
    code = body.code.strip()

    if not check_code(email, code):
        raise HTTPException(status_code=400, detail="Mã xác thực không đúng hoặc đã hết hạn.")

    return {"message": "Mã xác thực hợp lệ."}


# ══════════════════════════════════════════════════════════
# POST /reset-password
# ══════════════════════════════════════════════════════════

@router.post(
    "/reset-password",
    summary="Đặt lại mật khẩu",
    description="Đặt mật khẩu mới sau khi xác thực mã.",
)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    from app.services.email_service import verify_code as check_code, consume_code

    email = body.email.strip().lower()
    code = body.code.strip()
    new_password = body.new_password

    if not check_code(email, code):
        raise HTTPException(status_code=400, detail="Mã xác thực không đúng hoặc đã hết hạn.")

    # Find user
    result = await db.execute(sa_select(TaiKhoan).where(TaiKhoan.tk_email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    # Hash new password using the unified security module
    user.tk_matkhau = hash_password(new_password)
    await db.commit()

    # Consume the code so it can't be reused
    consume_code(email)

    return {"message": "Đặt lại mật khẩu thành công."}


# ══════════════════════════════════════════════════════════
# GET /google/login
# ══════════════════════════════════════════════════════════

@router.get(
    "/google/login",
    summary="Đăng nhập bằng Google",
    description="Redirect đến Google OAuth để đăng nhập.",
)
async def google_login(request: Request):
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth chưa được cấu hình trên server.")

    redirect_uri = _resolve_google_redirect_uri(settings, request)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    }
    authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(authorization_url)


# ══════════════════════════════════════════════════════════
# GET /google/callback
# ══════════════════════════════════════════════════════════

@router.get(
    "/google/callback",
    summary="Google OAuth callback",
    description="Xử lý callback từ Google OAuth.",
)
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    redirect_uri = _resolve_google_redirect_uri(settings, request)
    code = request.query_params.get("code")
    if not code:
        error = request.query_params.get("error", "unknown_error")
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")

    timeout = httpx.Timeout(connect=8.0, read=12.0, write=12.0, pool=8.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
        except httpx.HTTPError as exc:
            logger.error("Google token request failed: %s", exc)
            raise HTTPException(status_code=502, detail="Không thể kết nối Google OAuth.") from exc

        if token_resp.status_code != 200:
            logger.error("Google token exchange failed: status=%s body=%s", token_resp.status_code, token_resp.text)
            raise HTTPException(status_code=400, detail="Không thể lấy access token từ Google.")

        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Google không trả về access token hợp lệ.")

        try:
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
        except httpx.HTTPError as exc:
            logger.error("Google userinfo request failed: %s", exc)
            raise HTTPException(status_code=502, detail="Không thể lấy thông tin người dùng từ Google.") from exc

        if userinfo_resp.status_code != 200:
            logger.error("Google userinfo failed: status=%s body=%s", userinfo_resp.status_code, userinfo_resp.text)
            raise HTTPException(status_code=400, detail="Không thể lấy thông tin người dùng từ Google.")

        user_info = userinfo_resp.json()

    google_id = user_info.get("id")
    if not google_id:
        raise HTTPException(status_code=400, detail="Google không trả về định danh người dùng.")

    email = user_info.get("email")
    name = user_info.get("name")

    # Authenticate or create user
    service = AuthService(db)
    result = await service.google_login(google_id, email, name)

    frontend_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback"
    return RedirectResponse(
        f"{frontend_url}?token={result['access_token']}&token_type={result['token_type']}&vaitro={result['vaitro']}&tk_id={result['tk_id']}"
    )
