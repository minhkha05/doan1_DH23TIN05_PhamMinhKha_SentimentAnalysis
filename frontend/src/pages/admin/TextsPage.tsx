/* ═══════════════════════════════════════════════════
   Admin Texts Page – Manage all user-submitted texts
   Features: list, search, paginate, delete (soft)
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import {
    HiOutlineDocumentText,
    HiOutlineMagnifyingGlass,
    HiOutlineTrash,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineArrowPath,
    HiOutlineFaceSmile,
    HiOutlineFaceFrown,
    HiOutlineMinusCircle,
    HiOutlineEye,
} from 'react-icons/hi2';
import { adminService } from '../../services/adminService';
import type { AdminTextItem, CamXuc } from '../../types';
import toast from 'react-hot-toast';
import './AdminPages.css';

const PAGE_SIZE = 20;

const sentimentConfig: Record<CamXuc, { icon: React.ReactNode; label: string; class: string }> = {
    positive: { icon: <HiOutlineFaceSmile />, label: 'Tích cực', class: 'positive' },
    negative: { icon: <HiOutlineFaceFrown />, label: 'Tiêu cực', class: 'negative' },
    neutral: { icon: <HiOutlineMinusCircle />, label: 'Trung tính', class: 'neutral' },
};

const TextsPage: React.FC = () => {
    const [items, setItems] = useState<AdminTextItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    // Confirm dialog
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    // View dialog
    const [viewText, setViewText] = useState<string | null>(null);

    const fetchTexts = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, page_size: PAGE_SIZE };
            if (search.trim()) params.search = search.trim();
            const res = await adminService.getTexts(params);
            setItems(res.items);
            setTotal(res.total);
            setTotalPages(res.total_pages);
        } catch {
            toast.error('Không thể tải danh sách văn bản.');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchTexts();
    }, [fetchTexts]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleDelete = async (vbId: number) => {
        try {
            await adminService.deleteText(vbId);
            toast.success('Đã xóa văn bản.');
            setConfirmDeleteId(null);
            fetchTexts();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi khi xóa văn bản.');
        }
    };

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="admin-page texts-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineDocumentText /> Quản lý văn bản</h1>
                <p>Tổng cộng <strong>{total}</strong> văn bản — Tìm kiếm, xem và xóa văn bản rác</p>
            </div>

            {/* ── Toolbar ──────────────────────────── */}
            <div className="users-toolbar glass-card-static animate-fade-in-up stagger-1">
                <div className="users-search-box">
                    <HiOutlineMagnifyingGlass className="users-search-icon" />
                    <input
                        type="text"
                        className="input users-search-input"
                        placeholder="Tìm theo nội dung văn bản..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                <div className="users-filters">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setSearchInput(''); setPage(1); }}
                    >
                        <HiOutlineArrowPath size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* ── Table ─────────────────────────────── */}
            <div className="admin-table-wrapper glass-card-static animate-fade-in-up stagger-2">
                {loading ? (
                    <div className="users-table-loading"><div className="spinner" /></div>
                ) : items.length === 0 ? (
                    <div className="users-empty">
                        <HiOutlineDocumentText size={48} />
                        <p>Không tìm thấy văn bản nào.</p>
                    </div>
                ) : (
                    <div className="users-table-container">
                        <table className="table users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Người dùng</th>
                                    <th>Nội dung</th>
                                    <th>Kết quả AI</th>
                                    <th>Độ tin cậy</th>
                                    <th>Ngày tạo</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const config = item.camxuc_ai ? sentimentConfig[item.camxuc_ai] : null;
                                    return (
                                        <tr key={item.vb_id}>
                                            <td className="admin-td-id">#{item.vb_id}</td>
                                            <td>
                                                <span style={{ fontSize: 'var(--text-sm)' }}>
                                                    {item.user_email || item.user_sdt || '—'}
                                                </span>
                                            </td>
                                            <td className="admin-td-text" title={item.noidung}>
                                                {item.noidung}
                                            </td>
                                            <td>
                                                {config ? (
                                                    <span className={`badge badge-${config.class}`}>
                                                        {config.icon} {config.label}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="admin-td-confidence">
                                                {item.tincay != null
                                                    ? `${(item.tincay * 100).toFixed(1)}%`
                                                    : '—'}
                                            </td>
                                            <td className="admin-td-date">{formatDate(item.vb_taoluc)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', minHeight: '40px' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => setViewText(item.noidung)}
                                                        title="Xem chi tiết"
                                                    >
                                                        <HiOutlineEye size={18}  />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-delete" style={{ color: 'var(--negative)' }} onClick={() => setConfirmDeleteId(item.vb_id)}
                                                        title="Xóa văn bản"
                                                    >
                                                        <HiOutlineTrash size={18}  />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Pagination ────────────────────────── */}
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

            {viewText !== null && (
                <div className="confirm-overlay" onClick={() => setViewText(null)}>
                    <div className="confirm-dialog" style={{ maxWidth: '600px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <h3>Chi tiết nội dung</h3>
                        <div style={{
                            maxHeight: '400px',
                            overflowY: 'auto',
                            padding: '1rem',
                            marginTop: '1rem',
                            marginBottom: '1.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            lineHeight: '1.6',
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            textAlign: 'left'
                        }}>
                            {viewText}
                        </div>
                        <div className="confirm-actions">
                            <button className="btn btn-primary" onClick={() => setViewText(null)}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirm Delete Dialog ─────────────── */}
            {confirmDeleteId !== null && (
                <div className="confirm-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Xác nhận xóa</h3>
                        <p>Bạn có chắc muốn xóa văn bản #{confirmDeleteId} không?</p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                                Hủy
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ background: 'var(--negative)' }}
                                onClick={() => handleDelete(confirmDeleteId)}
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

export default TextsPage;





