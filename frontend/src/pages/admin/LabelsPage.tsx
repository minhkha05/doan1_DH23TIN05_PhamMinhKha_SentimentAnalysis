/* ═══════════════════════════════════════════════════
   Admin Labels Page – view & correct sentiment labels
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import {
    HiOutlineTag,
    HiOutlineCheck,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineEye,
} from 'react-icons/hi2';
import { adminService } from '../../services/adminService';
import type { ExportItem, CamXuc } from '../../types';
import toast from 'react-hot-toast';
import './AdminPages.css';

const sentimentOptions: { value: CamXuc; label: string; class: string }[] = [
    { value: 'positive', label: 'Tích cực', class: 'positive' },
    { value: 'negative', label: 'Tiêu cực', class: 'negative' },
    { value: 'neutral', label: 'Trung tính', class: 'neutral' },
];

const LabelsPage: React.FC = () => {
    const [items, setItems] = useState<ExportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewText, setViewText] = useState<string | null>(null);
    const [selectedSentiment, setSelectedSentiment] = useState<CamXuc>('positive');
    const [updating, setUpdating] = useState(false);
    const pageSize = 15;

    const fetchLabels = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getLabels(page, pageSize);
            setItems(res.items);
            setTotalPages(res.total_pages);
            setTotal(res.total);
        } catch {
            toast.error('Không thể tải danh sách nhãn.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchLabels();
    }, [fetchLabels]);

    const handleUpdateLabel = async (vbId: number) => {
        setUpdating(true);
        try {
            await adminService.updateLabel({ vb_id: vbId, camxuc_moi: selectedSentiment });
            toast.success('Cập nhật nhãn thành công!');
            setEditingId(null);
            fetchLabels();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Có lỗi xảy ra.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineTag /> Quản lý nhãn cảm xúc</h1>
                <p>Tổng cộng <strong>{total}</strong> văn bản · Sửa nhãn AI nếu không chính xác</p>
            </div>

            <div className="admin-table-wrapper glass-card-static animate-fade-in-up stagger-1">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nội dung</th>
                                <th>AI Label</th>
                                <th>Đã sửa</th>
                                <th>Final</th>
                                <th>Độ tin cậy</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.vb_id}>
                                    <td className="admin-td-id">#{item.vb_id}</td>
                                    <td className="admin-td-text">{item.noidung}</td>
                                    <td>
                                        {item.camxuc_ai && (
                                            <span className={`badge badge-${item.camxuc_ai}`}>
                                                {item.camxuc_ai === 'positive' ? 'Tích cực' : item.camxuc_ai === 'negative' ? 'Tiêu cực' : 'Trung tính'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {item.camxuc_suanhan && (
                                            <span className={`badge badge-${item.camxuc_suanhan}`}>
                                                {item.camxuc_suanhan === 'positive' ? 'Tích cực' : item.camxuc_suanhan === 'negative' ? 'Tiêu cực' : 'Trung tính'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {item.camxuc_final && (
                                            <span className={`badge badge-${item.camxuc_final}`}>
                                                {item.camxuc_final === 'positive' ? 'Tích cực' : item.camxuc_final === 'negative' ? 'Tiêu cực' : 'Trung tính'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="admin-td-confidence">
                                        {item.tincay != null ? `${(item.tincay * 100).toFixed(1)}%` : '-'}
                                    </td>
                                    <td>
                                        {editingId === item.vb_id ? (
                                            <div className="admin-edit-actions">
                                                <select
                                                    className="input admin-select"
                                                    value={selectedSentiment}
                                                    onChange={(e) => setSelectedSentiment(e.target.value as CamXuc)}
                                                >
                                                    {sentimentOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleUpdateLabel(item.vb_id)}
                                                    disabled={updating}
                                                >
                                                    <HiOutlineCheck />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => setViewText(item.noidung)}
                                                    title="Xem chi tiết"
                                                >
                                                    <HiOutlineEye size={18}  />
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => {
                                                        setEditingId(item.vb_id);
                                                        setSelectedSentiment(item.camxuc_final || 'neutral');
                                                    }}
                                                >
                                                    Sửa
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                        <HiOutlineChevronLeft />
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        Trang {page} / {totalPages}
                    </span>
                    <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
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
        </div>
    );
};

export default LabelsPage;


