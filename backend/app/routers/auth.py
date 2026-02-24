"""
Auth router – /api/v1/auth
Endpoints: register, login, profile
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.models import TaiKhoan
from app.schemas.schemas import (
    LoginRequest,
    RegisterRequest,
    SuccessResponse,
    TokenResponse,
    UserProfile,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


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
