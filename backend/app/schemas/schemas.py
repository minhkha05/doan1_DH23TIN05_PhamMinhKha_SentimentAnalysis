"""
Pydantic v2 schemas for request validation and response serialization.
"""

from datetime import datetime
from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# ══════════════════════════════════════════════════════════
# Enums (shared with frontend)
# ══════════════════════════════════════════════════════════

class VaiTroEnum(str, Enum):
    user = "user"
    admin = "admin"


class DangNhapEnum(str, Enum):
    email = "email"
    sodienthoai = "sodienthoai"
    google = "google"


class CamXucEnum(str, Enum):
    negative = "negative"
    positive = "positive"
    neutral = "neutral"


# ══════════════════════════════════════════════════════════
# Generic Pagination wrapper
# ══════════════════════════════════════════════════════════

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    success: bool = True
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[T]


class SuccessResponse(BaseModel):
    """Standard success response."""
    success: bool = True
    message: str = "OK"
    data: Optional[dict] = None


# ══════════════════════════════════════════════════════════
# AUTH Schemas
# ══════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    """Đăng ký tài khoản – hỗ trợ email hoặc SĐT."""
    email: Optional[EmailStr] = None
    sdt: Optional[str] = Field(None, min_length=9, max_length=20)
    matkhau: str = Field(..., min_length=6, max_length=128)

    @model_validator(mode="after")
    def check_at_least_one(self):
        if not self.email and not self.sdt:
            raise ValueError("Phải cung cấp email hoặc số điện thoại.")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "email": "user@example.com",
                    "matkhau": "StrongPass123",
                }
            ]
        }
    )


class LoginRequest(BaseModel):
    """Đăng nhập – gửi email hoặc SĐT."""
    email: Optional[EmailStr] = None
    sdt: Optional[str] = None
    matkhau: str

    @model_validator(mode="after")
    def check_at_least_one(self):
        if not self.email and not self.sdt:
            raise ValueError("Phải cung cấp email hoặc số điện thoại.")
        return self


class ForgotPasswordRequest(BaseModel):
    """Gửi mã xác thực qua email."""
    email: EmailStr


class VerifyResetCodeRequest(BaseModel):
    """Xác thực mã reset."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    """Đặt lại mật khẩu."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=128)


class TokenResponse(BaseModel):
    """JWT token trả về sau khi đăng nhập."""
    access_token: str
    token_type: str = "bearer"
    vaitro: VaiTroEnum
    tk_id: int


class UserProfile(BaseModel):
    """Thông tin tài khoản (trả về cho client)."""
    tk_id: int
    tk_email: Optional[str] = None
    tk_sdt: Optional[str] = None
    tk_vaitro: VaiTroEnum
    tk_dangnhap: DangNhapEnum
    tk_taoluc: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ══════════════════════════════════════════════════════════
# ADMIN USER MANAGEMENT Schemas
# ══════════════════════════════════════════════════════════

class AdminUserItem(BaseModel):
    """Thông tin user cho admin list."""
    tk_id: int
    tk_email: Optional[str] = None
    tk_sdt: Optional[str] = None
    tk_vaitro: VaiTroEnum
    tk_dangnhap: DangNhapEnum
    tk_xoa: bool = False
    tk_taoluc: Optional[datetime] = None
    tk_loginluc: Optional[datetime] = None
    tong_vanban: int = 0

    model_config = ConfigDict(from_attributes=True)


class UpdateRoleRequest(BaseModel):
    """Đổi vai trò người dùng."""
    vaitro: VaiTroEnum


class UpdateUserStatusRequest(BaseModel):
    """Khóa / mở khóa tài khoản."""
    xoa: bool  # True = khóa, False = mở khóa


# ══════════════════════════════════════════════════════════
# ANALYSIS Schemas
# ══════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    """Yêu cầu phân tích cảm xúc."""
    noidung: str = Field(..., min_length=1, max_length=10000, description="Văn bản cần phân tích")


class KetQuaResponse(BaseModel):
    """Kết quả phân tích cảm xúc."""
    kq_id: int
    vb_id: int
    noidung: str
    camxuc: CamXucEnum
    tincay: Optional[float] = None
    model: Optional[str] = None
    luclay: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AnalyzeResponse(BaseModel):
    """Response wrapper cho kết quả phân tích."""
    success: bool = True
    data: KetQuaResponse


class BatchAnalyzeItem(BaseModel):
    """Một dòng kết quả trong phân tích hàng loạt."""
    index: int
    noidung: str
    camxuc: Optional[CamXucEnum] = None
    tincay: Optional[float] = None
    model: Optional[str] = None
    vb_id: Optional[int] = None
    kq_id: Optional[int] = None
    error: Optional[str] = None


class BatchAnalyzeResponse(BaseModel):
    """Response cho phân tích cảm xúc từ file upload."""
    success: bool = True
    total_rows: int
    success_count: int
    failed_count: int
    items: List[BatchAnalyzeItem]


# ══════════════════════════════════════════════════════════
# HISTORY Schemas
# ══════════════════════════════════════════════════════════

class HistoryItem(BaseModel):
    """Một bản ghi lịch sử phân tích."""
    vb_id: int
    noidung: str
    camxuc: Optional[CamXucEnum] = None
    tincay: Optional[float] = None
    model: Optional[str] = None
    vb_taoluc: Optional[datetime] = None
    # Nhãn đã sửa (nếu có)
    camxuc_dasua: Optional[CamXucEnum] = None

    model_config = ConfigDict(from_attributes=True)


# ══════════════════════════════════════════════════════════
# ADMIN Schemas
# ══════════════════════════════════════════════════════════

class DashboardStats(BaseModel):
    """Thống kê tổng quan cho Admin dashboard."""
    tong_taikhoan: int = 0
    tong_vanban: int = 0
    tong_ketqua: int = 0
    tong_suanhan: int = 0
    phan_bo_camxuc: dict = {}
    vanban_theo_ngay: List[dict] = []


class LabelUpdateRequest(BaseModel):
    """Yêu cầu sửa nhãn cảm xúc."""
    vb_id: int
    camxuc_moi: CamXucEnum


class LabelUpdateResponse(BaseModel):
    """Response sau khi sửa nhãn."""
    sn_id: int
    vb_id: int
    camxuc_cu: Optional[CamXucEnum] = None
    camxuc_moi: CamXucEnum
    nguoi_sua: int
    luc_sua: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ExportItem(BaseModel):
    """Một dòng dữ liệu xuất – dùng COALESCE(suanhan, ketqua)."""
    vb_id: int
    noidung: str
    camxuc_ai: Optional[CamXucEnum] = None
    tincay: Optional[float] = None
    camxuc_suanhan: Optional[CamXucEnum] = None
    camxuc_final: Optional[CamXucEnum] = None
    model_ai: Optional[str] = None
    thoigian_phan_tich: Optional[datetime] = None
    vb_taoluc: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ExportResponse(BaseModel):
    """Response cho export."""
    success: bool = True
    xd_id: int
    file: str
    sodong: int
    items: List[ExportItem]


class ExportPreviewItem(BaseModel):
    """Một dòng preview dữ liệu trước khi export."""
    noidung: str
    camxuc: Optional[CamXucEnum] = None
    tincay: Optional[float] = None
    model_ai: Optional[str] = None
    thoigian_phan_tich: Optional[datetime] = None


class ExportHistoryItem(BaseModel):
    """Một dòng thống kê lịch sử export."""
    xd_id: int
    ten_file: str
    so_dong: int
    nguoi_xuat: str
    thoigian_xuat: Optional[datetime] = None


# ══════════════════════════════════════════════════════════
# PASSWORD CHANGE Schema
# ══════════════════════════════════════════════════════════

class ChangePasswordRequest(BaseModel):
    """Đổi mật khẩu – yêu cầu mật khẩu cũ + mới."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class UpdatePhoneRequest(BaseModel):
    """Cập nhật số điện thoại."""
    sdt: str = Field(..., min_length=9, max_length=20)


# ══════════════════════════════════════════════════════════
# ADMIN TEXT MANAGEMENT Schemas
# ══════════════════════════════════════════════════════════

class AdminTextItem(BaseModel):
    """Thông tin văn bản cho admin texts list."""
    vb_id: int
    noidung: str
    user_email: Optional[str] = None
    user_sdt: Optional[str] = None
    camxuc_ai: Optional[CamXucEnum] = None
    tincay: Optional[float] = None
    vb_taoluc: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
