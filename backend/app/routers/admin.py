"""
Admin router – /api/v1/admin
Endpoints: dashboard, users, labels, export
All endpoints require admin role.
"""

import math
from datetime import date

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import require_admin
from app.models.models import CamXuc, TaiKhoan
from app.schemas.schemas import (
    AdminTextItem,
    BatchAnalyzeItem,
    BatchAnalyzeResponse,
    AdminUserItem,
    DashboardStats,
    ExportHistoryItem,
    ExportItem,
    ExportPreviewItem,
    ExportResponse,
    HistoryItem,
    LabelUpdateRequest,
    LabelUpdateResponse,
    PaginatedResponse,
    SuccessResponse,
    UpdatePhoneRequest,
    UpdateRoleRequest,
    UpdateUserStatusRequest,
)
from app.services.admin_service import AdminService
from app.services.file_parser_service import extract_text_rows_from_upload

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
# GET /users – List users (search, filter, paginate)
# ══════════════════════════════════════════════════════════

@router.get(
    "/users",
    response_model=PaginatedResponse[AdminUserItem],
    summary="Danh sách người dùng",
    description="Liệt kê tất cả người dùng, hỗ trợ tìm kiếm, lọc vai trò, trạng thái.",
)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None, description="Tìm theo email hoặc SĐT"),
    role: str = Query(None, description="Lọc theo vai trò: user | admin"),
    status: str = Query(None, description="Lọc trạng thái: active | locked"),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    items, total = await service.list_users(
        page=page, page_size=page_size, search=search, role=role, status=status,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[AdminUserItem](
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[AdminUserItem(**item) for item in items],
    )


# ══════════════════════════════════════════════════════════
# PUT /users/{user_id}/role – Change role
# ══════════════════════════════════════════════════════════

@router.put(
    "/users/{user_id}/role",
    response_model=SuccessResponse,
    summary="Đổi vai trò người dùng",
    description="Thay đổi vai trò (user/admin) cho một tài khoản.",
)
async def update_user_role(
    user_id: int,
    body: UpdateRoleRequest,
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.update_user_role(user_id=user_id, new_role=body.vaitro.value)
    return SuccessResponse(message="Đã cập nhật vai trò.", data=result)


# ══════════════════════════════════════════════════════════
# PUT /users/{user_id}/status – Lock / Unlock
# ══════════════════════════════════════════════════════════

@router.put(
    "/users/{user_id}/status",
    response_model=SuccessResponse,
    summary="Khóa / mở khóa tài khoản",
    description="Khóa (soft delete) hoặc mở khóa tài khoản.",
)
async def update_user_status(
    user_id: int,
    body: UpdateUserStatusRequest,
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.update_user_status(user_id=user_id, xoa=body.xoa)
    msg = "Đã khóa tài khoản." if body.xoa else "Đã mở khóa tài khoản."
    return SuccessResponse(message=msg, data=result)


# ══════════════════════════════════════════════════════════
# DELETE /users/{user_id} – Soft-delete user
# ══════════════════════════════════════════════════════════

@router.delete(
    "/users/{user_id}",
    response_model=SuccessResponse,
    summary="Xóa tài khoản",
    description="Soft-delete tài khoản người dùng và toàn bộ dữ liệu liên quan.",
)
async def delete_user(
    user_id: int,
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    await service.delete_user(user_id=user_id)
    return SuccessResponse(message="Đã xóa tài khoản.")


# ══════════════════════════════════════════════════════════
# PUT /users/{user_id}/phone – Admin update user's phone
# ══════════════════════════════════════════════════════════

@router.put(
    "/users/{user_id}/phone",
    response_model=SuccessResponse,
    summary="Cập nhật SĐT người dùng",
    description="Admin cập nhật số điện thoại cho người dùng.",
)
async def update_user_phone(
    user_id: int,
    body: UpdatePhoneRequest,
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.update_user_phone(user_id=user_id, new_sdt=body.sdt)
    return SuccessResponse(message="Đã cập nhật số điện thoại.", data=result)


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
    start_date: date | None = Query(None, description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Ngày kết thúc (YYYY-MM-DD)"),
    sentiment: CamXuc | None = Query(None, description="Lọc cảm xúc: negative | neutral | positive"),
    model_ai: str | None = Query(None, description="Lọc theo model AI"),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.export_data(
        admin_id=admin.tk_id,
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
        sentiment=sentiment,
        model_ai=model_ai,
    )
    return ExportResponse(
        xd_id=result["xd_id"],
        file=result["file"],
        sodong=result["sodong"],
        items=[ExportItem(**item) for item in result["items"]],
    )


@router.get(
    "/export/preview",
    response_model=PaginatedResponse[ExportPreviewItem],
    summary="Preview dữ liệu export",
    description="Xem trước dữ liệu sẽ export theo bộ lọc thời gian, cảm xúc, model.",
)
async def export_preview(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    start_date: date | None = Query(None, description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Ngày kết thúc (YYYY-MM-DD)"),
    sentiment: CamXuc | None = Query(None, description="Lọc cảm xúc: negative | neutral | positive"),
    model_ai: str | None = Query(None, description="Lọc theo model AI"),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    _ = admin
    service = AdminService(db)
    items, total = await service.get_export_preview(
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
        sentiment=sentiment,
        model_ai=model_ai,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[ExportPreviewItem](
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[ExportPreviewItem(**item) for item in items],
    )


@router.get(
    "/export/download",
    summary="Tải file dữ liệu xuất",
    description=(
        "Xuất dữ liệu theo khoảng thời gian từ vanban + ketqua + suanhan. "
        "Ưu tiên nhãn ở suanhan, nếu chưa có thì dùng ketqua. "
        "Hỗ trợ CSV hoặc Excel và ghi lịch sử vào xuatdulieu."
    ),
)
async def export_download(
    start_date: date | None = Query(None, description="Ngày bắt đầu (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Ngày kết thúc (YYYY-MM-DD)"),
    sentiment: CamXuc | None = Query(None, description="Lọc cảm xúc: negative | neutral | positive"),
    model_ai: str | None = Query(None, description="Lọc theo model AI"),
    file_format: str = Query("csv", pattern="^(csv|xlsx)$"),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    result = await service.export_data_file(
        admin_id=admin.tk_id,
        file_format=file_format,
        start_date=start_date,
        end_date=end_date,
        sentiment=sentiment,
        model_ai=model_ai,
    )

    return Response(
        content=result["payload"],
        media_type=result["media_type"],
        headers={
            "Content-Disposition": f"attachment; filename={result['filename']}",
            "X-Export-Id": str(result["xd_id"]),
            "X-Export-File": result["filename"],
            "X-Export-Rows": str(result["row_count"]),
        },
    )


@router.get(
    "/export/history",
    response_model=PaginatedResponse[ExportHistoryItem],
    summary="Thống kê lịch sử export",
    description="Lấy bảng thống kê lịch sử export trực tiếp từ xuatdulieu.",
)
async def export_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    _ = admin
    service = AdminService(db)
    items, total = await service.list_export_history(page=page, page_size=page_size)
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[ExportHistoryItem](
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[ExportHistoryItem(**item) for item in items],
    )


# ══════════════════════════════════════════════════════════# GET /texts – Admin manage all texts
# ════════════════════════════════════════════════════════

@router.get(
    "/texts",
    response_model=PaginatedResponse[AdminTextItem],
    summary="Quản lý văn bản",
    description="Liệt kê toàn bộ câu văn user đã nhập (phân trang, tìm kiếm).",
)
async def list_texts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None, description="Tìm theo nội dung văn bản"),
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    items, total = await service.list_texts(
        page=page, page_size=page_size, search=search,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[AdminTextItem](
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[AdminTextItem(**item) for item in items],
    )


# ════════════════════════════════════════════════════════
# DELETE /texts/{vb_id} – Admin xóa văn bản rác
# ════════════════════════════════════════════════════════

@router.delete(
    "/texts/{vb_id}",
    response_model=SuccessResponse,
    summary="Xóa văn bản",
    description="Admin soft-delete một văn bản rác.",
)
async def delete_text(
    vb_id: int,
    admin: TaiKhoan = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    await service.delete_text(vb_id=vb_id)
    return SuccessResponse(message="Đã xóa văn bản.")


# ════════════════════════════════════════════════════════# GET /models – List available AI models
# ══════════════════════════════════════════════════════════

@router.get(
    "/models",
    summary="Danh sách mô hình AI",
    description="Liệt kê tất cả mô hình PhoBERT đã fine-tune trong thư mục /models.",
)
async def list_models(
    admin: TaiKhoan = Depends(require_admin),
):
    from app.services.ai_service import list_available_models, get_active_model_name

    models = list_available_models()
    active = get_active_model_name()
    return {
        "models": models,
        "active_model": active,
    }


@router.post(
    "/analyze-batch",
    response_model=BatchAnalyzeResponse,
    summary="Admin phân tích hàng loạt từ file",
    description="Upload file .txt/.csv/.tsv và phân tích hàng loạt bằng model mặc định (không lưu DB).",
)
async def analyze_batch(
    file: UploadFile = File(...),
    admin: TaiKhoan = Depends(require_admin),
):
    from app.services.ai_service import predict_sentiment

    texts = await extract_text_rows_from_upload(file)
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


# ══════════════════════════════════════════════════════════
# POST /models/test – Test a specific model
# ══════════════════════════════════════════════════════════

from pydantic import BaseModel as PydanticBaseModel


class TestModelRequest(PydanticBaseModel):
    noidung: str
    model_name: str


@router.post(
    "/models/test-batch",
    response_model=BatchAnalyzeResponse,
    summary="Test model với file upload",
    description="Upload file nhiều câu để test một model cụ thể (không lưu DB).",
)
async def test_model_batch(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    admin: TaiKhoan = Depends(require_admin),
):
    from app.services.ai_service import list_available_models, predict_sentiment
    from app.core.exceptions import NotFoundException

    model_names = [m["name"] for m in list_available_models()]
    if model_name not in model_names:
        raise NotFoundException(detail=f"Mô hình '{model_name}' không tồn tại.")

    texts = await extract_text_rows_from_upload(file)
    items: list[BatchAnalyzeItem] = []
    for idx, text in enumerate(texts, start=1):
        prediction = await predict_sentiment(text, model_name=model_name)
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


@router.post(
    "/models/test",
    summary="Test mô hình AI",
    description="Phân tích cảm xúc bằng mô hình cụ thể (không lưu DB).",
)
async def test_model(
    body: TestModelRequest,
    admin: TaiKhoan = Depends(require_admin),
):
    from app.services.ai_service import predict_sentiment

    prediction = await predict_sentiment(body.noidung, model_name=body.model_name)
    return {
        "camxuc": prediction["camxuc"],
        "tincay": prediction["tincay"],
        "noidung": body.noidung,
        "model": prediction["model"],
    }


# ══════════════════════════════════════════════════════════
# PUT /models/active – Set default model
# ══════════════════════════════════════════════════════════

class SetActiveModelRequest(PydanticBaseModel):
    model_name: str


@router.put(
    "/models/active",
    response_model=SuccessResponse,
    summary="Đặt mô hình mặc định",
    description="Chọn mô hình AI mặc định cho phân tích cảm xúc của user.",
)
async def set_active_model(
    body: SetActiveModelRequest,
    admin: TaiKhoan = Depends(require_admin),
):
    from app.services.ai_service import list_available_models, set_active_model_name

    models = list_available_models()
    model_names = [m["name"] for m in models]
    if body.model_name not in model_names:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(detail=f"Mô hình '{body.model_name}' không tồn tại.")

    set_active_model_name(body.model_name)
    return SuccessResponse(
        message=f"Đã đặt '{body.model_name}' làm mô hình mặc định.",
        data={"active_model": body.model_name},
    )

