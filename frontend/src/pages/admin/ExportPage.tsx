/* ═══════════════════════════════════════════════════
   Admin Export Page – smart data export
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
    HiOutlineArrowDownTray,
    HiOutlineDocumentArrowDown,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
} from 'react-icons/hi2';
import { adminService } from '../../services/adminService';
import type { ExportItem } from '../../types';
import toast from 'react-hot-toast';
import './AdminPages.css';

const ExportPage: React.FC = () => {
    const [items, setItems] = useState<ExportItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [exported, setExported] = useState(false);
    const [exportInfo, setExportInfo] = useState({ xd_id: 0, file: '', sodong: 0 });
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const handleExport = async (p = 1) => {
        setLoading(true);
        try {
            const res = await adminService.exportData(p, pageSize);
            setItems(res.items);
            setExportInfo({ xd_id: res.xd_id, file: res.file, sodong: res.sodong });
            setExported(true);
            setPage(p);
            toast.success(`Xuất ${res.sodong} dòng dữ liệu thành công!`);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (items.length === 0) return;
        const headers = ['vb_id', 'noidung', 'camxuc_ai', 'tincay', 'camxuc_suanhan', 'camxuc_final', 'vb_taoluc'];
        const csvContent = [
            headers.join(','),
            ...items.map((item) =>
                [
                    item.vb_id,
                    `"${(item.noidung || '').replace(/"/g, '""')}"`,
                    item.camxuc_ai || '',
                    item.tincay ?? '',
                    item.camxuc_suanhan || '',
                    item.camxuc_final || '',
                    item.vb_taoluc || '',
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = exportInfo.file || 'export.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Đã tải file CSV!');
    };

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineArrowDownTray /> Xuất dữ liệu</h1>
                <p>Export dữ liệu với logic COALESCE (ưu tiên nhãn đã sửa)</p>
            </div>

            <div className="export-action-card glass-card-static animate-fade-in-up stagger-1">
                <div className="export-action-content">
                    <HiOutlineDocumentArrowDown size={40} className="export-icon" />
                    <div>
                        <h3>Xuất dữ liệu thông minh</h3>
                        <p>
                            Dữ liệu sẽ sử dụng nhãn cuối cùng: nếu admin đã sửa nhãn thì lấy nhãn đã sửa,
                            ngược lại lấy nhãn AI. Log xuất dữ liệu sẽ được ghi vào hệ thống.
                        </p>
                    </div>
                </div>
                <div className="export-action-buttons">
                    <button className="btn btn-primary btn-lg" onClick={() => handleExport(1)} disabled={loading}>
                        {loading ? (
                            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang xuất...</>
                        ) : (
                            <><HiOutlineArrowDownTray /> Xuất dữ liệu</>
                        )}
                    </button>
                    {exported && items.length > 0 && (
                        <button className="btn btn-secondary btn-lg" onClick={downloadCSV}>
                            <HiOutlineDocumentArrowDown /> Tải CSV
                        </button>
                    )}
                </div>
            </div>

            {exported && (
                <>
                    <div className="export-info glass-card-static animate-fade-in-up stagger-2">
                        <span>Export ID: <strong>#{exportInfo.xd_id}</strong></span>
                        <span>File: <strong>{exportInfo.file}</strong></span>
                        <span>Số dòng: <strong>{exportInfo.sodong}</strong></span>
                    </div>

                    {items.length > 0 && (
                        <div className="admin-table-wrapper glass-card-static animate-fade-in-up stagger-3">
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nội dung</th>
                                            <th>AI</th>
                                            <th>Sửa nhãn</th>
                                            <th>Final</th>
                                            <th>Tin cậy</th>
                                            <th>Ngày tạo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.vb_id}>
                                                <td className="admin-td-id">#{item.vb_id}</td>
                                                <td className="admin-td-text">{item.noidung}</td>
                                                <td>
                                                    {item.camxuc_ai && <span className={`badge badge-${item.camxuc_ai}`}>{item.camxuc_ai}</span>}
                                                </td>
                                                <td>
                                                    {item.camxuc_suanhan && <span className={`badge badge-${item.camxuc_suanhan}`}>{item.camxuc_suanhan}</span>}
                                                </td>
                                                <td>
                                                    {item.camxuc_final && <span className={`badge badge-${item.camxuc_final}`}>{item.camxuc_final}</span>}
                                                </td>
                                                <td className="admin-td-confidence">
                                                    {item.tincay != null ? `${(item.tincay * 100).toFixed(1)}%` : '-'}
                                                </td>
                                                <td className="admin-td-date">
                                                    {item.vb_taoluc ? new Date(item.vb_taoluc).toLocaleDateString('vi-VN') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="pagination">
                        <button className="pagination-btn" onClick={() => handleExport(page - 1)} disabled={page <= 1 || loading}>
                            <HiOutlineChevronLeft />
                        </button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Trang {page}</span>
                        <button className="pagination-btn" onClick={() => handleExport(page + 1)} disabled={items.length < pageSize || loading}>
                            <HiOutlineChevronRight />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExportPage;
