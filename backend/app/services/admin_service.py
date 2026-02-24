"""
Admin service – dashboard stats, label correction, smart data export.
"""

import csv
import io
import os
from datetime import datetime, timezone
from typing import List, Tuple

from sqlalchemy import case, func, select, text
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
    # Smart Data Export – COALESCE(suanhan.camxuc, ketqua.camxuc)
    # ══════════════════════════════════════════════════════

    async def export_data(
        self,
        admin_id: int,
        page: int = 1,
        page_size: int = 100,
    ) -> dict:
        """
        Export data with COALESCE logic:
        Final label = suanhan.camxuc if corrected, else ketqua.camxuc.
        Logs the export into xuatdulieu table.
        """
        # Build the smart query using subqueries
        # Latest suanhan per vanban
        latest_sn_subq = (
            select(
                SuaNhan.sn_vb_id,
                SuaNhan.sn_camxuc,
            )
            .where(SuaNhan.sn_xoa == False)  # noqa: E712
            .distinct(SuaNhan.sn_vb_id)
            .order_by(SuaNhan.sn_vb_id, SuaNhan.sn_lucgan.desc())
            .subquery("latest_sn")
        )

        # Main query
        stmt = (
            select(
                VanBan.vb_id,
                VanBan.vb_noidung,
                KetQua.kq_camxuc,
                KetQua.kq_tincay,
                latest_sn_subq.c.sn_camxuc,
                func.coalesce(
                    latest_sn_subq.c.sn_camxuc,
                    KetQua.kq_camxuc,
                ).label("camxuc_final"),
                VanBan.vb_taoluc,
            )
            .join(KetQua, KetQua.kq_vb_id == VanBan.vb_id, isouter=True)
            .join(
                latest_sn_subq,
                latest_sn_subq.c.sn_vb_id == VanBan.vb_id,
                isouter=True,
            )
            .where(
                VanBan.vb_xoa == False,  # noqa: E712
            )
            .order_by(VanBan.vb_id)
        )

        # Count total
        count_stmt = (
            select(func.count())
            .select_from(VanBan)
            .where(VanBan.vb_xoa == False)  # noqa: E712
        )
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Paginate
        offset = (page - 1) * page_size
        paginated_stmt = stmt.offset(offset).limit(page_size)
        result = await self.db.execute(paginated_stmt)
        rows = result.all()

        items = []
        for row in rows:
            items.append(
                {
                    "vb_id": row.vb_id,
                    "noidung": row.vb_noidung,
                    "camxuc_ai": row.kq_camxuc,
                    "tincay": row.kq_tincay,
                    "camxuc_suanhan": row.sn_camxuc,
                    "camxuc_final": row.camxuc_final,
                    "vb_taoluc": row.vb_taoluc,
                }
            )

        # Log the export
        filename = f"export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        xuat = XuatDuLieu(
            xd_tk_id=admin_id,
            xd_file=filename,
            xd_sodong=len(items),
        )
        self.db.add(xuat)
        await self.db.flush()
        await self.db.refresh(xuat)

        return {
            "xd_id": xuat.xd_id,
            "file": filename,
            "sodong": len(items),
            "total": total,
            "items": items,
        }
