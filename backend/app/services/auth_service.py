"""
Authentication service – register, login, user retrieval.
Uses Repository/Service pattern to keep business logic separate from routes.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.models.models import DangNhap, TaiKhoan, VaiTro


class AuthService:
    """Encapsulates authentication business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Register ──────────────────────────────────────────
    async def register(
        self,
        email: Optional[str],
        sdt: Optional[str],
        matkhau: str,
    ) -> TaiKhoan:
        """
        Create a new user account.
        - Checks for duplicate email/phone.
        - Hashes password before storing.
        """
        # Check existing email
        if email:
            stmt = select(TaiKhoan).where(
                TaiKhoan.tk_email == email,
                TaiKhoan.tk_xoa == False,  # noqa: E712
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ConflictException(detail="Email đã được đăng ký.")

        # Check existing phone
        if sdt:
            stmt = select(TaiKhoan).where(
                TaiKhoan.tk_sdt == sdt,
                TaiKhoan.tk_xoa == False,  # noqa: E712
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ConflictException(detail="Số điện thoại đã được đăng ký.")

        # Determine login type
        dang_nhap = DangNhap.email if email else DangNhap.sodienthoai

        new_user = TaiKhoan(
            tk_email=email,
            tk_sdt=sdt,
            tk_matkhau=hash_password(matkhau),
            tk_vaitro=VaiTro.user,
            tk_dangnhap=dang_nhap,
        )
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)
        return new_user

    # ── Login ─────────────────────────────────────────────
    async def login(
        self,
        email: Optional[str],
        sdt: Optional[str],
        matkhau: str,
    ) -> dict:
        """
        Authenticate user and return JWT token.
        Supports login via email or phone.
        """
        if email:
            stmt = select(TaiKhoan).where(
                TaiKhoan.tk_email == email,
                TaiKhoan.tk_xoa == False,  # noqa: E712
            )
        elif sdt:
            stmt = select(TaiKhoan).where(
                TaiKhoan.tk_sdt == sdt,
                TaiKhoan.tk_xoa == False,  # noqa: E712
            )
        else:
            raise BadRequestException(detail="Phải cung cấp email hoặc số điện thoại.")

        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise UnauthorizedException(detail="Tài khoản không tồn tại.")

        if not verify_password(matkhau, user.tk_matkhau):
            raise UnauthorizedException(detail="Mật khẩu không chính xác.")

        # Update last login timestamp
        # asyncpg requires naive datetime for TIMESTAMP WITHOUT TIME ZONE columns
        user.tk_loginluc = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.flush()

        # Create JWT
        token = create_access_token(
            data={
                "sub": str(user.tk_id),
                "vaitro": user.tk_vaitro.value,
            }
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "vaitro": user.tk_vaitro,
            "tk_id": user.tk_id,
        }

    # ── Get user by ID ────────────────────────────────────
    async def get_user_by_id(self, user_id: int) -> TaiKhoan:
        """Fetch a non-deleted user by primary key."""
        stmt = select(TaiKhoan).where(
            TaiKhoan.tk_id == user_id,
            TaiKhoan.tk_xoa == False,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(detail="Không tìm thấy tài khoản.")
        return user
