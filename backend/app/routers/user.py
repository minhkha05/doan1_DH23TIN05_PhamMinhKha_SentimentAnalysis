"""
User router – /api/v1/user
Endpoints: analyze, history
"""

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.models import TaiKhoan
from app.schemas.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    HistoryItem,
    KetQuaResponse,
    PaginatedResponse,
)
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/v1/user", tags=["User"])


# ══════════════════════════════════════════════════════════
# POST /analyze
# ══════════════════════════════════════════════════════════

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Phân tích cảm xúc văn bản",
    description="Nhận text, lưu vào DB, gọi AI phân tích và trả về kết quả.",
)
async def analyze_text(
    body: AnalyzeRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalysisService(db)
    result = await service.analyze_text(
        user_id=current_user.tk_id,
        noidung=body.noidung,
    )
    return AnalyzeResponse(data=KetQuaResponse(**result))


# ══════════════════════════════════════════════════════════
# GET /history
# ══════════════════════════════════════════════════════════

@router.get(
    "/history",
    response_model=PaginatedResponse[HistoryItem],
    summary="Lịch sử phân tích cá nhân",
    description="Trả về danh sách lịch sử phân tích của user (có phân trang).",
)
async def get_history(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(20, ge=1, le=100, description="Số item mỗi trang"),
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalysisService(db)
    items, total = await service.get_history(
        user_id=current_user.tk_id,
        page=page,
        page_size=page_size,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedResponse[HistoryItem](
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[HistoryItem(**item) for item in items],
    )
