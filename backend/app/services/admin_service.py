"""
Admin service – dashboard stats, label correction, smart data export.
"""

import csv
import io
from datetime import date, datetime, time, timezone
from typing import List, Literal, Tuple

from openpyxl import Workbook

from sqlalchemy import case, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.models import (
    CamXuc,
    KetQua,
    SuaNhan,
    TaiKhoan,
    VanBan,
    XuatDuLieu,
)


class AdminService:
    """Business logic for admin-only operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # Dashboard Statistics
    # ══════════════════════════════════════════════════════

    async def get_dashboard_stats(self) -> dict:
        """
        Aggregation queries for admin dashboard.
        Returns counts, sentiment distribution, and daily trend.
        """
        # Total accounts (non-deleted)
        tong_tk = (
            await self.db.execute(
                select(func.count()).select_from(TaiKhoan).where(TaiKhoan.tk_xoa == False)  # noqa: E712
            )
        ).scalar() or 0

        # Total texts
        tong_vb = (
            await self.db.execute(
                select(func.count()).select_from(VanBan).where(VanBan.vb_xoa == False)  # noqa: E712
            )
        ).scalar() or 0

        # Total results
        tong_kq = (
            await self.db.execute(
                select(func.count()).select_from(KetQua).where(KetQua.kq_xoa == False)  # noqa: E712
            )
        ).scalar() or 0

        # Total label corrections
        tong_sn = (
            await self.db.execute(
                select(func.count()).select_from(SuaNhan).where(SuaNhan.sn_xoa == False)  # noqa: E712
            )
        ).scalar() or 0

        # Sentiment distribution
        dist_stmt = (
            select(KetQua.kq_camxuc, func.count().label("so_luong"))
            .where(KetQua.kq_xoa == False)  # noqa: E712
            .group_by(KetQua.kq_camxuc)
        )
        dist_result = await self.db.execute(dist_stmt)
        phan_bo = {row.kq_camxuc.value: row.so_luong for row in dist_result.all()}

        # Texts per day (last 30 days)
        daily_stmt = (
            select(
                func.date_trunc("day", VanBan.vb_taoluc).label("ngay"),
                func.count().label("so_luong"),
            )
            .where(VanBan.vb_xoa == False)  # noqa: E712
            .group_by(text("1"))
            .order_by(text("1"))
            .limit(30)
        )
        daily_result = await self.db.execute(daily_stmt)
        vanban_ngay = [
            {"ngay": str(row.ngay), "so_luong": row.so_luong}
            for row in daily_result.all()
        ]

        return {
            "tong_taikhoan": tong_tk,
            "tong_vanban": tong_vb,
            "tong_ketqua": tong_kq,
            "tong_suanhan": tong_sn,
            "phan_bo_camxuc": phan_bo,
            "vanban_theo_ngay": vanban_ngay,
        }

    # ══════════════════════════════════════════════════════
    # User Management
    # ══════════════════════════════════════════════════════

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        role: str | None = None,
        status: str | None = None,
    ) -> Tuple[List[dict], int]:
        """List all users with search, filter, pagination."""
        from sqlalchemy import or_

        # Base condition
        conditions = []
        if search:
            search_like = f"%{search}%"
            conditions.append(
                or_(
                    TaiKhoan.tk_email.ilike(search_like),
                    TaiKhoan.tk_sdt.ilike(search_like),
                )
            )
        if role and role in ("user", "admin"):
            from app.models.models import VaiTro as VaiTroModel
            conditions.append(TaiKhoan.tk_vaitro == VaiTroModel(role))
        if status == "active":
            conditions.append(TaiKhoan.tk_xoa == False)  # noqa: E712
        elif status == "locked":
            conditions.append(TaiKhoan.tk_xoa == True)  # noqa: E712

        # Count
        count_stmt = select(func.count()).select_from(TaiKhoan)
        for c in conditions:
            count_stmt = count_stmt.where(c)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Query with text count subquery
        vb_count_subq = (
            select(
                VanBan.vb_tk_id,
                func.count().label("tong_vanban"),
            )
            .where(VanBan.vb_xoa == False)  # noqa: E712
            .group_by(VanBan.vb_tk_id)
            .subquery("vb_count")
        )

        stmt = (
            select(
                TaiKhoan,
                func.coalesce(vb_count_subq.c.tong_vanban, 0).label("tong_vanban"),
            )
            .outerjoin(vb_count_subq, TaiKhoan.tk_id == vb_count_subq.c.vb_tk_id)
        )
        for c in conditions:
            stmt = stmt.where(c)
        stmt = stmt.order_by(TaiKhoan.tk_id.desc())

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)
        result = await self.db.execute(stmt)
        rows = result.all()

        users = []
        for row in rows:
            user = row[0]  # TaiKhoan object
            tong_vb = row[1]  # count
            users.append({
                "tk_id": user.tk_id,
                "tk_email": user.tk_email,
                "tk_sdt": user.tk_sdt,
                "tk_vaitro": user.tk_vaitro,
                "tk_dangnhap": user.tk_dangnhap,
                "tk_xoa": user.tk_xoa,
                "tk_taoluc": user.tk_taoluc,
                "tk_loginluc": user.tk_loginluc,
                "tong_vanban": tong_vb,
            })

        return users, total

    async def update_user_role(self, user_id: int, new_role: str) -> dict:
        """Change user role."""
        from app.models.models import VaiTro as VaiTroModel
        stmt = select(TaiKhoan).where(TaiKhoan.tk_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(detail=f"Không tìm thấy tài khoản ID={user_id}.")
        user.tk_vaitro = VaiTroModel(new_role)
        await self.db.flush()
        await self.db.refresh(user)
        return {
            "tk_id": user.tk_id,
            "tk_vaitro": user.tk_vaitro,
        }

    async def update_user_status(self, user_id: int, xoa: bool) -> dict:
        """Lock/unlock user (soft delete)."""
        stmt = select(TaiKhoan).where(TaiKhoan.tk_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(detail=f"Không tìm thấy tài khoản ID={user_id}.")
        user.tk_xoa = xoa
        user.tk_xoaluc = datetime.now(timezone.utc).replace(tzinfo=None) if xoa else None
        await self.db.flush()
        await self.db.refresh(user)
        return {
            "tk_id": user.tk_id,
            "tk_xoa": user.tk_xoa,
        }

    async def delete_user(self, user_id: int) -> None:
        """Soft-delete a user and all their vanban + ketqua."""
        stmt = select(TaiKhoan).where(TaiKhoan.tk_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(detail=f"Không tìm thấy tài khoản ID={user_id}.")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        user.tk_xoa = True
        user.tk_xoaluc = now

        # Soft-delete all user's vanban
        vb_ids_stmt = select(VanBan.vb_id).where(
            VanBan.vb_tk_id == user_id,
            VanBan.vb_xoa == False,  # noqa: E712
        )
        vb_ids_result = await self.db.execute(vb_ids_stmt)
        vb_ids = [row[0] for row in vb_ids_result.all()]

        if vb_ids:
            await self.db.execute(
                update(VanBan)
                .where(VanBan.vb_id.in_(vb_ids))
                .values(vb_xoa=True, vb_xoaluc=now)
            )
            await self.db.execute(
                update(KetQua)
                .where(KetQua.kq_vb_id.in_(vb_ids), KetQua.kq_xoa == False)  # noqa: E712
                .values(kq_xoa=True, kq_xoaluc=now)
            )

    async def update_user_phone(self, user_id: int, new_sdt: str) -> dict:
        """Admin updates a user's phone number."""
        from sqlalchemy import or_

        stmt = select(TaiKhoan).where(TaiKhoan.tk_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(detail=f"Không tìm thấy tài khoản ID={user_id}.")

        # Check duplicate phone
        if new_sdt:
            dup_stmt = select(TaiKhoan).where(
                TaiKhoan.tk_sdt == new_sdt,
                TaiKhoan.tk_id != user_id,
            )
            dup = await self.db.execute(dup_stmt)
            if dup.scalar_one_or_none():
                from app.core.exceptions import ConflictException
                raise ConflictException(detail="Số điện thoại đã được sử dụng bởi tài khoản khác.")

        user.tk_sdt = new_sdt if new_sdt else None
        await self.db.flush()
        await self.db.refresh(user)
        return {"tk_id": user.tk_id, "tk_sdt": user.tk_sdt}

    # ══════════════════════════════════════════════════════
    # Label Management (sửa nhãn)
    # ══════════════════════════════════════════════════════

    async def update_label(
        self,
        admin_id: int,
        vb_id: int,
        camxuc_moi: CamXuc,
    ) -> dict:
        """
        Admin corrects the sentiment label.
        Creates a new suanhan record.
        """
        # Verify vanban exists
        vb_stmt = select(VanBan).where(
            VanBan.vb_id == vb_id, VanBan.vb_xoa == False  # noqa: E712
        ).options(selectinload(VanBan.ket_qua))
        result = await self.db.execute(vb_stmt)
        van_ban = result.scalar_one_or_none()
        if not van_ban:
            raise NotFoundException(detail=f"Không tìm thấy văn bản ID={vb_id}.")

        # Get current AI label
        kq = next((k for k in van_ban.ket_qua if not k.kq_xoa), None)
        camxuc_cu = kq.kq_camxuc if kq else None

        # Create correction record
        sua_nhan = SuaNhan(
            sn_vb_id=vb_id,
            sn_camxuc=camxuc_moi,
            sn_tk_id=admin_id,
        )
        self.db.add(sua_nhan)
        await self.db.flush()
        await self.db.refresh(sua_nhan)

        return {
            "sn_id": sua_nhan.sn_id,
            "vb_id": vb_id,
            "camxuc_cu": camxuc_cu,
            "camxuc_moi": camxuc_moi,
            "nguoi_sua": admin_id,
            "luc_sua": sua_nhan.sn_lucgan,
        }

    # ── List all labels (paginated) for review ────────────
    async def list_labels(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[dict], int]:
        """List all vanban with AI result and latest correction."""
        count_stmt = (
            select(func.count())
            .select_from(VanBan)
            .where(VanBan.vb_xoa == False)  # noqa: E712
        )
        total = (await self.db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(VanBan)
            .where(VanBan.vb_xoa == False)  # noqa: E712
            .options(
                selectinload(VanBan.ket_qua),
                selectinload(VanBan.sua_nhan),
            )
            .order_by(VanBan.vb_id.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = result.scalars().all()

        data = []
        for vb in items:
            kq = next((k for k in vb.ket_qua if not k.kq_xoa), None)
            sn = next(
                (
                    s
                    for s in sorted(
                        vb.sua_nhan, key=lambda x: x.sn_lucgan or "", reverse=True
                    )
                    if not s.sn_xoa
                ),
                None,
            )
            data.append(
                {
                    "vb_id": vb.vb_id,
                    "noidung": vb.vb_noidung,
                    "camxuc_ai": kq.kq_camxuc if kq else None,
                    "tincay": kq.kq_tincay if kq else None,
                    "camxuc_suanhan": sn.sn_camxuc if sn else None,
                    "camxuc_final": sn.sn_camxuc if sn else (kq.kq_camxuc if kq else None),
                    "vb_taoluc": vb.vb_taoluc,
                }
            )

        return data, total

    # ══════════════════════════════════════════════════════
    # Text Management (admin quản lý văn bản)
    # ══════════════════════════════════════════════════════

    async def list_texts(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> Tuple[List[dict], int]:
        """List all texts with user info and AI result (paginated)."""
        conditions = [VanBan.vb_xoa == False]  # noqa: E712
        if search:
            conditions.append(VanBan.vb_noidung.ilike(f"%{search}%"))

        count_stmt = select(func.count()).select_from(VanBan)
        for c in conditions:
            count_stmt = count_stmt.where(c)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(VanBan)
            .where(*conditions)
            .options(
                selectinload(VanBan.ket_qua),
                selectinload(VanBan.tai_khoan),
            )
            .order_by(VanBan.vb_id.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = result.scalars().all()

        data = []
        for vb in items:
            kq = next((k for k in vb.ket_qua if not k.kq_xoa), None)
            data.append({
                "vb_id": vb.vb_id,
                "noidung": vb.vb_noidung,
                "user_email": vb.tai_khoan.tk_email if vb.tai_khoan else None,
                "user_sdt": vb.tai_khoan.tk_sdt if vb.tai_khoan else None,
                "camxuc_ai": kq.kq_camxuc if kq else None,
                "tincay": kq.kq_tincay if kq else None,
                "vb_taoluc": vb.vb_taoluc,
            })

        return data, total

    async def delete_text(self, vb_id: int) -> None:
        """Soft-delete a text (admin removes spam/junk)."""
        stmt = select(VanBan).where(
            VanBan.vb_id == vb_id,
            VanBan.vb_xoa == False,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        van_ban = result.scalar_one_or_none()
        if not van_ban:
            raise NotFoundException(detail=f"Không tìm thấy văn bản ID={vb_id}.")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        van_ban.vb_xoa = True
        van_ban.vb_xoaluc = now

        # Soft-delete related ketqua
        await self.db.execute(
            update(KetQua)
            .where(KetQua.kq_vb_id == vb_id, KetQua.kq_xoa == False)  # noqa: E712
            .values(kq_xoa=True, kq_xoaluc=now)
        )

    # ══════════════════════════════════════════════════════
    # Smart Data Export – preview, download, history
    # ══════════════════════════════════════════════════════

    def _build_export_query(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        sentiment: CamXuc | None = None,
        model_ai: str | None = None,
    ):
        """Build base export query with label priority and optional filters."""
        latest_sn_ranked = (
            select(
                SuaNhan.sn_vb_id.label("vb_id"),
                SuaNhan.sn_camxuc.label("camxuc_suanhan"),
                func.row_number()
                .over(
                    partition_by=SuaNhan.sn_vb_id,
                    order_by=(SuaNhan.sn_lucgan.desc(), SuaNhan.sn_id.desc()),
                )
                .label("rn"),
            )
            .where(SuaNhan.sn_xoa == False)  # noqa: E712
            .subquery("latest_sn_ranked")
        )

        latest_sn = (
            select(
                latest_sn_ranked.c.vb_id,
                latest_sn_ranked.c.camxuc_suanhan,
            )
            .where(latest_sn_ranked.c.rn == 1)
            .subquery("latest_sn")
        )

        latest_kq_ranked = (
            select(
                KetQua.kq_vb_id.label("vb_id"),
                KetQua.kq_camxuc.label("camxuc_ai"),
                KetQua.kq_tincay.label("tincay"),
                KetQua.kq_model.label("model_ai"),
                KetQua.kq_luclay.label("thoigian_phan_tich"),
                func.row_number()
                .over(
                    partition_by=KetQua.kq_vb_id,
                    order_by=(KetQua.kq_luclay.desc(), KetQua.kq_id.desc()),
                )
                .label("rn"),
            )
            .where(KetQua.kq_xoa == False)  # noqa: E712
            .subquery("latest_kq_ranked")
        )

        latest_kq = (
            select(
                latest_kq_ranked.c.vb_id,
                latest_kq_ranked.c.camxuc_ai,
                latest_kq_ranked.c.tincay,
                latest_kq_ranked.c.model_ai,
                latest_kq_ranked.c.thoigian_phan_tich,
            )
            .where(latest_kq_ranked.c.rn == 1)
            .subquery("latest_kq")
        )

        final_sentiment = func.coalesce(
            latest_sn.c.camxuc_suanhan,
            latest_kq.c.camxuc_ai,
        ).label("camxuc")

        stmt = (
            select(
                VanBan.vb_noidung.label("noidung"),
                final_sentiment,
                latest_kq.c.tincay,
                latest_kq.c.model_ai,
                latest_kq.c.thoigian_phan_tich,
            )
            .select_from(VanBan)
            .join(latest_kq, latest_kq.c.vb_id == VanBan.vb_id, isouter=True)
            .join(latest_sn, latest_sn.c.vb_id == VanBan.vb_id, isouter=True)
            .where(
                VanBan.vb_xoa == False,  # noqa: E712
                latest_kq.c.thoigian_phan_tich.is_not(None),
            )
        )

        if start_date:
            start_dt = datetime.combine(start_date, time.min)
            stmt = stmt.where(latest_kq.c.thoigian_phan_tich >= start_dt)

        if end_date:
            end_dt = datetime.combine(end_date, time.max)
            stmt = stmt.where(latest_kq.c.thoigian_phan_tich <= end_dt)

        if sentiment:
            stmt = stmt.where(final_sentiment == sentiment)

        if model_ai:
            stmt = stmt.where(latest_kq.c.model_ai == model_ai)

        stmt = stmt.order_by(latest_kq.c.thoigian_phan_tich.desc(), VanBan.vb_id.desc())
        return stmt

    async def get_export_preview(
        self,
        page: int = 1,
        page_size: int = 20,
        start_date: date | None = None,
        end_date: date | None = None,
        sentiment: CamXuc | None = None,
        model_ai: str | None = None,
    ) -> Tuple[List[dict], int]:
        """Get paginated preview rows based on export filters."""
        base_stmt = self._build_export_query(
            start_date=start_date,
            end_date=end_date,
            sentiment=sentiment,
            model_ai=model_ai,
        )

        count_stmt = select(func.count()).select_from(base_stmt.subquery("export_preview"))
        total = (await self.db.execute(count_stmt)).scalar() or 0

        rows = (
            await self.db.execute(
                base_stmt.offset((page - 1) * page_size).limit(page_size)
            )
        ).all()

        items = [
            {
                "noidung": row.noidung,
                "camxuc": row.camxuc,
                "tincay": row.tincay,
                "model_ai": row.model_ai,
                "thoigian_phan_tich": row.thoigian_phan_tich,
            }
            for row in rows
        ]

        return items, total

    async def export_data_file(
        self,
        admin_id: int,
        file_format: Literal["csv", "xlsx"],
        start_date: date | None = None,
        end_date: date | None = None,
        sentiment: CamXuc | None = None,
        model_ai: str | None = None,
    ) -> dict:
        """Create export file bytes and save export history."""
        rows = (
            await self.db.execute(
                self._build_export_query(
                    start_date=start_date,
                    end_date=end_date,
                    sentiment=sentiment,
                    model_ai=model_ai,
                )
            )
        ).all()

        now = datetime.now(timezone.utc)
        filename = f"export_{now.strftime('%Y%m%d_%H%M%S')}.{file_format}"

        headers = [
            "Noi dung van ban",
            "Cam xuc",
            "Do tin cay",
            "Model AI",
            "Thoi gian phan tich",
        ]

        if file_format == "csv":
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(headers)
            for row in rows:
                writer.writerow(
                    [
                        row.noidung or "",
                        row.camxuc.value if row.camxuc else "",
                        row.tincay,
                        row.model_ai or "",
                        row.thoigian_phan_tich.isoformat() if row.thoigian_phan_tich else "",
                    ]
                )
            payload = ("\ufeff" + buffer.getvalue()).encode("utf-8")
            media_type = "text/csv; charset=utf-8"
        else:
            wb = Workbook()
            ws = wb.active
            ws.title = "Export"
            ws.append(headers)
            for row in rows:
                ws.append(
                    [
                        row.noidung or "",
                        row.camxuc.value if row.camxuc else "",
                        row.tincay,
                        row.model_ai or "",
                        row.thoigian_phan_tich.replace(tzinfo=None) if row.thoigian_phan_tich else None,
                    ]
                )
            stream = io.BytesIO()
            wb.save(stream)
            payload = stream.getvalue()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        xuat = XuatDuLieu(
            xd_tk_id=admin_id,
            xd_file=filename,
            xd_sodong=len(rows),
        )
        self.db.add(xuat)
        await self.db.flush()
        await self.db.refresh(xuat)

        return {
            "xd_id": xuat.xd_id,
            "filename": filename,
            "row_count": len(rows),
            "payload": payload,
            "media_type": media_type,
        }

    async def list_export_history(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[dict], int]:
        """Get export history from xuatdulieu for admin monitoring."""
        count_stmt = (
            select(func.count())
            .select_from(XuatDuLieu)
            .where(XuatDuLieu.xd_xoa == False)  # noqa: E712
        )
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = (
            select(
                XuatDuLieu.xd_id,
                XuatDuLieu.xd_file,
                XuatDuLieu.xd_sodong,
                XuatDuLieu.xd_taoluc,
                TaiKhoan.tk_email,
                TaiKhoan.tk_sdt,
            )
            .join(TaiKhoan, TaiKhoan.tk_id == XuatDuLieu.xd_tk_id, isouter=True)
            .where(XuatDuLieu.xd_xoa == False)  # noqa: E712
            .order_by(XuatDuLieu.xd_taoluc.desc(), XuatDuLieu.xd_id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        rows = (await self.db.execute(stmt)).all()
        items = [
            {
                "xd_id": row.xd_id,
                "ten_file": row.xd_file,
                "so_dong": row.xd_sodong or 0,
                "nguoi_xuat": row.tk_email or row.tk_sdt or f"tk_{row.xd_id}",
                "thoigian_xuat": row.xd_taoluc,
            }
            for row in rows
        ]

        return items, total

    async def export_data(
        self,
        admin_id: int,
        page: int = 1,
        page_size: int = 100,
        start_date: date | None = None,
        end_date: date | None = None,
        sentiment: CamXuc | None = None,
        model_ai: str | None = None,
    ) -> dict:
        """
        Legacy response for export preview compatibility.
        This endpoint returns paginated preview items and does not write history.
        """
        _ = admin_id
        preview_items, total = await self.get_export_preview(
            page=page,
            page_size=page_size,
            start_date=start_date,
            end_date=end_date,
            sentiment=sentiment,
            model_ai=model_ai,
        )

        items = [
            {
                "vb_id": (page - 1) * page_size + idx,
                "noidung": row["noidung"],
                "camxuc_ai": row["camxuc"],
                "tincay": row["tincay"],
                "camxuc_suanhan": None,
                "camxuc_final": row["camxuc"],
                "model_ai": row["model_ai"],
                "thoigian_phan_tich": row["thoigian_phan_tich"],
                "vb_taoluc": row["thoigian_phan_tich"],
            }
            for idx, row in enumerate(preview_items, start=1)
        ]

        filename = f"preview_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

        return {
            "xd_id": 0,
            "file": filename,
            "sodong": len(items),
            "total": total,
            "items": items,
        }
