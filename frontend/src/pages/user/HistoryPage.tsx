/* ═══════════════════════════════════════════════════
   History Page – paginated analysis history
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import {
    HiOutlineClock,
    HiOutlineFaceSmile,
    HiOutlineFaceFrown,
    HiOutlineMinusCircle,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineTrash,
} from 'react-icons/hi2';
import { userService } from '../../services/userService';
import type { HistoryItem, CamXuc } from '../../types';
import toast from 'react-hot-toast';
import './HistoryPage.css';

const sentimentConfig: Record<CamXuc, { icon: React.ReactNode; label: string; class: string }> = {
    positive: { icon: <HiOutlineFaceSmile />, label: 'Tích cực', class: 'positive' },
    negative: { icon: <HiOutlineFaceFrown />, label: 'Tiêu cực', class: 'negative' },
    neutral: { icon: <HiOutlineMinusCircle />, label: 'Trung tính', class: 'neutral' },
};

const HistoryPage: React.FC = () => {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    // Confirm dialog state
    const [confirmAction, setConfirmAction] = useState<{
        type: 'delete-one' | 'clear-all';
        vbId?: number;
    } | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userService.getHistory(page, pageSize);
            setItems(res.items);
            setTotalPages(res.total_pages);
            setTotal(res.total);
        } catch (err: any) {
            toast.error('Không thể tải lịch sử.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDeleteOne = async (vbId: number) => {
        try {
            await userService.deleteHistoryItem(vbId);
            toast.success('Đã xóa mục lịch sử.');
            setConfirmAction(null);
            fetchHistory();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi khi xóa.');
        }
    };

    const handleClearAll = async () => {
        try {
            const res = await userService.clearHistory();
            toast.success(res.message || 'Đã xóa tất cả lịch sử.');
            setConfirmAction(null);
            setPage(1);
            fetchHistory();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi khi xóa.');
        }
    };

    return (
        <div className="history-page">
            <div className="history-header animate-fade-in-down">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1><HiOutlineClock /> Lịch sử phân tích</h1>
                        <p>Tổng cộng <strong>{total}</strong> lần phân tích</p>
                    </div>
                    {total > 0 && (
                        <button
                            className="btn btn-ghost"
                            style={{ color: 'var(--negative)', gap: 'var(--space-2)', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => setConfirmAction({ type: 'clear-all' })}
                        >
                            <HiOutlineTrash /> Xóa tất cả
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="page-loader"><div className="spinner spinner-lg" /></div>
            ) : items.length === 0 ? (
                <div className="history-empty glass-card-static animate-fade-in-up">
                    <HiOutlineClock size={48} />
                    <h3>Chưa có lịch sử</h3>
                    <p>Hãy thử phân tích văn bản đầu tiên!</p>
                </div>
            ) : (
                <>
                    <div className="history-list">
                        {items.map((item, idx) => {
                            const config = item.camxuc ? sentimentConfig[item.camxuc] : null;
                            return (
                                <div
                                    key={item.vb_id}
                                    className={`history-item glass-card animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`}
                                >
                                    <div className="history-item-content">
                                        <p className="history-item-text">{item.noidung}</p>
                                        <div className="history-item-meta">
                                            {item.vb_taoluc && (
                                                <span>{new Date(item.vb_taoluc).toLocaleString('vi-VN')}</span>
                                            )}
                                            {item.model && <span className="history-item-model">{item.model}</span>}
                                        </div>
                                    </div>
                                    <div className="history-item-result">
                                        {config && (
                                            <>
                                                <div className={`badge badge-${config.class}`}>
                                                    {config.icon} {config.label}
                                                </div>
                                                {item.tincay != null && (
                                                    <span className="history-item-confidence">
                                                        {(item.tincay * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                                {item.camxuc_dasua && item.camxuc_dasua !== item.camxuc && (
                                                    <div className={`badge badge-${sentimentConfig[item.camxuc_dasua].class}`} style={{ marginTop: 4 }}>
                                                        Sửa: {sentimentConfig[item.camxuc_dasua].label}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <button
                                            className="btn-icon history-delete-btn"
                                            title="Xóa"
                                            onClick={() => setConfirmAction({ type: 'delete-one', vbId: item.vb_id })}
                                        >
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <HiOutlineChevronLeft />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 7) {
                                    pageNum = i + 1;
                                } else if (page <= 4) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 3) {
                                    pageNum = totalPages - 6 + i;
                                } else {
                                    pageNum = page - 3 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                className="pagination-btn"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                <HiOutlineChevronRight />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ── Confirm Dialog ──────────────────────── */}
            {confirmAction && (
                <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Xác nhận xóa</h3>
                        <p>
                            {confirmAction.type === 'clear-all'
                                ? 'Bạn có chắc muốn xóa TẤT CẢ lịch sử phân tích không? Hành động này không thể hoàn tác.'
                                : 'Bạn có chắc muốn xóa mục lịch sử này không?'}
                        </p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>
                                Hủy
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ background: 'var(--negative)' }}
                                onClick={() => {
                                    if (confirmAction.type === 'clear-all') {
                                        handleClearAll();
                                    } else if (confirmAction.vbId) {
                                        handleDeleteOne(confirmAction.vbId);
                                    }
                                }}
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
