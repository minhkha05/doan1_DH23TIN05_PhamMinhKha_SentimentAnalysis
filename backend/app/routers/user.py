"""
User router – /api/v1/user
Endpoints: analyze, history
"""

import math

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.models import TaiKhoan
from app.schemas.schemas import (
    AnalyzeRequest,
    BatchAnalyzeItem,
    BatchAnalyzeResponse,
    AnalyzeResponse,
    ChangePasswordRequest,
    HistoryItem,
    KetQuaResponse,
    PaginatedResponse,
    SuccessResponse,
    UpdatePhoneRequest,
)
from app.services.analysis_service import AnalysisService
from app.services.auth_service import AuthService
from app.services.file_parser_service import extract_text_rows_from_upload

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


@router.post(
    "/analyze-batch",
    response_model=BatchAnalyzeResponse,
    summary="Phân tích cảm xúc từ file upload",
    description="Upload file .txt/.csv/.tsv chứa nhiều câu đánh giá và lưu toàn bộ kết quả vào DB.",
)
async def analyze_batch(
    file: UploadFile = File(...),
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    texts = await extract_text_rows_from_upload(file)

    service = AnalysisService(db)
    results = await service.analyze_batch_texts(user_id=current_user.tk_id, texts=texts)

    return BatchAnalyzeResponse(
        total_rows=len(texts),
        success_count=len(results),
        failed_count=0,
        items=[
            BatchAnalyzeItem(
                index=item["index"],
                noidung=item["noidung"],
                camxuc=item["camxuc"],
                tincay=item["tincay"],
                model=item["model"],
                vb_id=item["vb_id"],
                kq_id=item["kq_id"],
            )
            for item in results
        ],
    )


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


# ══════════════════════════════════════════════════════════
# POST /analyze-free (no auth, no DB save)
# ══════════════════════════════════════════════════════════

@router.post(
    "/analyze-free",
    summary="Phân tích cảm xúc miễn phí (không lưu DB)",
    description="Cho người dùng chưa đăng nhập thử trải nghiệm AI. Không lưu kết quả.",
)
async def analyze_free(body: AnalyzeRequest):
    from app.services.ai_service import predict_sentiment

    prediction = await predict_sentiment(body.noidung)
    return {
        "camxuc": prediction["camxuc"],
        "tincay": prediction["tincay"],
        "noidung": body.noidung,
        "model": prediction["model"],
    }


# ══════════════════════════════════════════════════════════
# POST /analyze-free-batch (no auth, no DB save)
# ══════════════════════════════════════════════════════════

@router.post(
    "/analyze-free-batch",
    response_model=BatchAnalyzeResponse,
    summary="Phân tích cảm xúc miễn phí từ file upload (không lưu DB)",
    description="Upload file .txt/.csv/.tsv để phân tích nhanh, không lưu kết quả vào DB.",
)
async def analyze_free_batch(file: UploadFile = File(...)):
    from app.services.ai_service import predict_sentiment

    texts = await extract_text_rows_from_upload(file)
    max_rows = 200
    texts = texts[:max_rows]

    items: list[BatchAnalyzeItem] = []
    for idx, text in enumerate(texts, start=1):
        prediction = await predict_sentiment(text)
        items.append(
            BatchAnalyzeItem(
                index=idx,
                noidung=text,
                camxuc=prediction["camxuc"],
                tincay=prediction["tincay"],
                model=prediction["model"],
            )
        )

    return BatchAnalyzeResponse(
        total_rows=len(texts),
        success_count=len(items),
        failed_count=0,
        items=items,
    )


# ════════════════════════════════════════════════════════
# DELETE /history/clear (Đặt trước /{id} để tránh conflict)
# ════════════════════════════════════════════════════════

@router.delete(
    "/history/clear",
    response_model=SuccessResponse,
    summary="Xóa tất cả lịch sử",
    description="Soft-delete toàn bộ lịch sử phân tích của user.",
)
async def clear_history(
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalysisService(db)
    count = await service.clear_history(user_id=current_user.tk_id)
    return SuccessResponse(
        message=f"Đã xóa {count} mục lịch sử.",
        data={"deleted_count": count},
    )


# ════════════════════════════════════════════════════════
# DELETE /history/{vb_id}
# ════════════════════════════════════════════════════════

@router.delete(
    "/history/{vb_id}",
    response_model=SuccessResponse,
    summary="Xóa 1 mục lịch sử",
    description="Soft-delete một bản ghi lịch sử phân tích.",
)
async def delete_history_item(
    vb_id: int,
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AnalysisService(db)
    await service.delete_history_item(user_id=current_user.tk_id, vb_id=vb_id)
    return SuccessResponse(message="Đã xóa mục lịch sử.")


# ════════════════════════════════════════════════════════
# PUT /password
# ════════════════════════════════════════════════════════

@router.put(
    "/password",
    response_model=SuccessResponse,
    summary="Đổi mật khẩu",
    description="Đổi mật khẩu tài khoản (yêu cầu nhập mật khẩu cũ).",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    await service.change_password(
        user_id=current_user.tk_id,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Đổi mật khẩu thành công.")


# ════════════════════════════════════════════════════════
# PUT /phone
# ════════════════════════════════════════════════════════

@router.put(
    "/phone",
    response_model=SuccessResponse,
    summary="Cập nhật số điện thoại",
    description="Cập nhật số điện thoại của tài khoản hiện tại.",
)
async def update_phone(
    body: UpdatePhoneRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.update_phone(
        user_id=current_user.tk_id,
        new_sdt=body.sdt,
    )
    return SuccessResponse(message="Cập nhật số điện thoại thành công.", data=result)
