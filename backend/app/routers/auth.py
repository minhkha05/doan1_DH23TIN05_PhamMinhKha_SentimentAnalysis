"""
Auth router – /api/v1/auth
Endpoints: register, login, profile, forgot-password, verify-reset-code, reset-password
"""

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
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

    # Hash new password
    hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user.tk_matkhau = hashed
    await db.commit()

    # Consume the code so it can't be reused
    consume_code(email)

    return {"message": "Đặt lại mật khẩu thành công."}
