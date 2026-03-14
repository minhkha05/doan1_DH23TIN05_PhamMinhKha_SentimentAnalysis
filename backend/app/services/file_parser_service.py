"""Helpers to parse uploaded review files into text rows."""

import csv
import io
from pathlib import Path

from fastapi import UploadFile

from app.core.exceptions import BadRequestException

_ALLOWED_EXTENSIONS = {".txt", ".csv", ".tsv"}
_MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024
_MAX_ROWS = 500
_MAX_TEXT_LENGTH = 10000
_HEADER_CANDIDATES = {
    "noidung",
    "text",
    "review",
    "content",
    "comment",
    "sentence",
    "description",
}


def _decode_bytes(payload: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "cp1258", "latin-1"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise BadRequestException(detail="Không đọc được file. Hãy dùng UTF-8/UTF-16.")


def _normalize(value: str) -> str:
    return value.strip().lower().replace(" ", "").replace("_", "")


def _pick_text_column(rows: list[list[str]]) -> tuple[int, int]:
    if not rows:
        raise BadRequestException(detail="File không có dữ liệu.")

    header = [cell.strip() for cell in rows[0]]
    normalized = [_normalize(cell) for cell in header]
    for idx, name in enumerate(normalized):
        if name in _HEADER_CANDIDATES:
            return idx, 1

    max_cols = max((len(row) for row in rows), default=0)
    if max_cols == 0:
        raise BadRequestException(detail="File không có cột hợp lệ.")

    score = [0] * max_cols
    sample_rows = rows[: min(len(rows), 50)]
    for row in sample_rows:
        for idx in range(max_cols):
            if idx < len(row) and row[idx].strip():
                score[idx] += 1

    best_idx = max(range(max_cols), key=lambda i: score[i])
    return best_idx, 0


def _parse_delimited_text(text: str, delimiter: str) -> list[str]:
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows = list(reader)
    if not rows:
        raise BadRequestException(detail="File không có dữ liệu.")

    column_index, start_row = _pick_text_column(rows)
    output: list[str] = []
    for row in rows[start_row:]:
        if column_index >= len(row):
            continue
        value = row[column_index].strip()
        if not value:
            continue
        output.append(value[:_MAX_TEXT_LENGTH])
        if len(output) >= _MAX_ROWS:
            break

    return output


async def extract_text_rows_from_upload(file: UploadFile) -> list[str]:
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise BadRequestException(
            detail="Định dạng file không hỗ trợ. Chỉ nhận .txt, .csv, .tsv",
        )

    payload = await file.read()
    if not payload:
        raise BadRequestException(detail="File trống.")
    if len(payload) > _MAX_FILE_SIZE_BYTES:
        raise BadRequestException(detail="File quá lớn. Giới hạn 3MB.")

    decoded = _decode_bytes(payload)

    if ext == ".txt":
        rows = [line.strip()[:_MAX_TEXT_LENGTH] for line in decoded.splitlines() if line.strip()]
    elif ext == ".tsv":
        rows = _parse_delimited_text(decoded, delimiter="\t")
    else:
        rows = _parse_delimited_text(decoded, delimiter=",")

    if not rows:
        raise BadRequestException(detail="Không tìm thấy câu đánh giá hợp lệ trong file.")

    return rows