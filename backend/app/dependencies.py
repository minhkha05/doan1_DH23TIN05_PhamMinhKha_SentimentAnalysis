"""
FastAPI dependency injection utilities.
- get_db: async database session
- get_current_user: JWT → user extraction
- require_admin: role-based access control
"""

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.models.models import TaiKhoan, VaiTro
from app.services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> TaiKhoan:
    """
    Extract and validate the current user from the JWT token.
    Raises UnauthorizedException if token is invalid or user not found.
    """
    payload = decode_access_token(token)
    if payload is None:
        raise UnauthorizedException(detail="Token không hợp lệ hoặc đã hết hạn.")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException(detail="Token không chứa thông tin người dùng.")

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise UnauthorizedException(detail="Token không hợp lệ.")

    auth_service = AuthService(db)
    return await auth_service.get_user_by_id(user_id)


async def require_admin(
    current_user: TaiKhoan = Depends(get_current_user),
) -> TaiKhoan:
    """
    Middleware dependency: only allow admin users.
    Raises ForbiddenException if user is not admin.
    """
    if current_user.tk_vaitro != VaiTro.admin:
        raise ForbiddenException(detail="Chỉ Admin mới có quyền truy cập.")
    return current_user
