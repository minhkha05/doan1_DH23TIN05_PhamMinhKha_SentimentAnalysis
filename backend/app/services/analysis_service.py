"""
Analysis service – text analysis, history retrieval.
Handles the flow: save text → call AI → save result → return.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.models import KetQua, SuaNhan, VanBan
from app.services.ai_service import predict_sentiment


class AnalysisService:
    """Business logic for text analysis and user history."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Analyze Text ──────────────────────────────────────
    async def analyze_text(self, user_id: int, noidung: str) -> dict:
        """
        Full analysis pipeline:
        1. Save text to vanban
        2. Call AI prediction
        3. Save result to ketqua
        4. Return structured response
        """
        # 1. Save text
        van_ban = VanBan(vb_tk_id=user_id, vb_noidung=noidung)
        self.db.add(van_ban)
        await self.db.flush()
        await self.db.refresh(van_ban)

        # 2. AI prediction
        prediction = await predict_sentiment(noidung)

        # 3. Save result
        ket_qua = KetQua(
            kq_vb_id=van_ban.vb_id,
            kq_camxuc=prediction["camxuc"],
            kq_tincay=prediction["tincay"],
            kq_model=prediction["model"],
        )
        self.db.add(ket_qua)
        await self.db.flush()
        await self.db.refresh(ket_qua)

        # 4. Return
        return {
            "kq_id": ket_qua.kq_id,
            "vb_id": van_ban.vb_id,
            "noidung": van_ban.vb_noidung,
            "camxuc": ket_qua.kq_camxuc,
            "tincay": ket_qua.kq_tincay,
            "model": ket_qua.kq_model,
            "luclay": ket_qua.kq_luclay,
        }

    # ── User History (paginated) ──────────────────────────
    async def get_history(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[dict], int]:
        """
        Fetch paginated analysis history for a specific user.
        Includes corrected label from suanhan if available.
        Returns (items, total_count).
        """
        # Count total
        count_stmt = (
            select(func.count())
            .select_from(VanBan)
            .where(VanBan.vb_tk_id == user_id, VanBan.vb_xoa == False)  # noqa: E712
        )
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Fetch items with eager-loaded relationships
        offset = (page - 1) * page_size
        stmt = (
            select(VanBan)
            .where(VanBan.vb_tk_id == user_id, VanBan.vb_xoa == False)  # noqa: E712
            .options(
                selectinload(VanBan.ket_qua),
                selectinload(VanBan.sua_nhan),
            )
            .order_by(VanBan.vb_taoluc.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        van_bans = result.scalars().all()

        items = []
        for vb in van_bans:
            # Get the first non-deleted ketqua
            kq = next(
                (k for k in vb.ket_qua if not k.kq_xoa), None
            )
            # Get the latest non-deleted suanhan
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
            items.append(
                {
                    "vb_id": vb.vb_id,
                    "noidung": vb.vb_noidung,
                    "camxuc": kq.kq_camxuc if kq else None,
                    "tincay": kq.kq_tincay if kq else None,
                    "model": kq.kq_model if kq else None,
                    "vb_taoluc": vb.vb_taoluc,
                    "camxuc_dasua": sn.sn_camxuc if sn else None,
                }
            )

        return items, total

    # ── Delete single history item (soft delete) ───────
    async def delete_history_item(self, user_id: int, vb_id: int) -> None:
        """
        Soft-delete a single history item belonging to the user.
        Also soft-deletes related ketqua rows.
        """
        stmt = select(VanBan).where(
            VanBan.vb_id == vb_id,
            VanBan.vb_tk_id == user_id,
            VanBan.vb_xoa == False,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        van_ban = result.scalar_one_or_none()
        if not van_ban:
            raise NotFoundException(detail=f"Không tìm thấy lịch sử ID={vb_id}.")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        van_ban.vb_xoa = True
        van_ban.vb_xoaluc = now

        # Soft-delete related ketqua
        await self.db.execute(
            update(KetQua)
            .where(KetQua.kq_vb_id == vb_id, KetQua.kq_xoa == False)  # noqa: E712
            .values(kq_xoa=True, kq_xoaluc=now)
        )

        await self.db.commit()

    # ── Clear all history for a user (soft delete) ────
    async def clear_history(self, user_id: int) -> int:
        """
        Soft-delete ALL history items of a user.
        Returns the number of items deleted.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Get IDs of vanban to delete
        vb_ids_stmt = select(VanBan.vb_id).where(
            VanBan.vb_tk_id == user_id,
            VanBan.vb_xoa == False,  # noqa: E712
        )
        result = await self.db.execute(vb_ids_stmt)
        vb_ids = [row[0] for row in result.all()]

        if not vb_ids:
            return 0

        # Soft-delete vanban
        await self.db.execute(
            update(VanBan)
            .where(VanBan.vb_id.in_(vb_ids))
            .values(vb_xoa=True, vb_xoaluc=now)
        )

        # Soft-delete related ketqua
        await self.db.execute(
            update(KetQua)
            .where(KetQua.kq_vb_id.in_(vb_ids), KetQua.kq_xoa == False)  # noqa: E712
            .values(kq_xoa=True, kq_xoaluc=now)
        )

        await self.db.commit()
        return len(vb_ids)
