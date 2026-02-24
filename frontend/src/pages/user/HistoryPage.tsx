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

    return (
        <div className="history-page">
            <div className="history-header animate-fade-in-down">
                <h1><HiOutlineClock /> Lịch sử phân tích</h1>
                <p>Tổng cộng <strong>{total}</strong> lần phân tích</p>
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
        </div>
    );
};

export default HistoryPage;
