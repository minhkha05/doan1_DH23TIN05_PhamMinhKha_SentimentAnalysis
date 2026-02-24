"""
Admin router – /api/v1/admin
Endpoints: dashboard, labels, export
All endpoints require admin role.
"""

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import require_admin
from app.models.models import CamXuc, TaiKhoan
from app.schemas.schemas import (
    DashboardStats,
    ExportItem,
    ExportResponse,
    HistoryItem,
    LabelUpdateRequest,
    LabelUpdateResponse,
    PaginatedResponse,
    SuccessResponse,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


# ══════════════════════════════════════════════════════════
# GET /dashboard
# ══════════════════════════════════════════════════════════

@router.get(
    "/dashboard",
    response_model=DashboardStats,
    summary="Thống kê tổng quan",
    description="Dashboard admin: tổng tài khoản, văn bản, phân bố cảm xúc, xu hướng theo ngày.",
)
async def get_dashboard(
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    stats = await service.get_dashboard_stats()
    return DashboardStats(**stats)


# ══════════════════════════════════════════════════════════
# GET /labels – List all labels for review
# ══════════════════════════════════════════════════════════

@router.get(
    "/labels",
    response_model=PaginatedResponse[ExportItem],
    summary="Danh sách nhãn cảm xúc",
    description="Liệt kê tất cả văn bản kèm nhãn AI và nhãn đã sửa (phân trang).",
)
async def list_labels(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    items, total = await service.list_labels(page=page, page_size=page_size)
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedResponse[ExportItem](
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[ExportItem(**item) for item in items],
    )


# ══════════════════════════════════════════════════════════
# PUT /labels – Update (correct) a label
# ══════════════════════════════════════════════════════════

@router.put(
    "/labels",
    response_model=LabelUpdateResponse,
    summary="Sửa nhãn cảm xúc",
    description="Admin sửa nhãn cảm xúc cho một văn bản (ghi vào bảng suanhan).",
)
async def update_label(
    body: LabelUpdateRequest,
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.update_label(
        admin_id=admin.tk_id,
        vb_id=body.vb_id,
        camxuc_moi=CamXuc(body.camxuc_moi.value),
    )
    return LabelUpdateResponse(**result)


# ══════════════════════════════════════════════════════════
# GET /export – Smart data export
# ══════════════════════════════════════════════════════════

@router.get(
    "/export",
    response_model=ExportResponse,
    summary="Xuất dữ liệu thông minh",
    description="Export dữ liệu với logic COALESCE(suanhan.camxuc, ketqua.camxuc). Ghi log vào bảng xuatdulieu.",
)
async def export_data(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.export_data(
        admin_id=admin.tk_id,
        page=page,
        page_size=page_size,
    )
    return ExportResponse(
        xd_id=result["xd_id"],
        file=result["file"],
        sodong=result["sodong"],
        items=[ExportItem(**item) for item in result["items"]],
    )
