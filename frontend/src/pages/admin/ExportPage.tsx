import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    HiOutlineArrowDownTray,
    HiOutlineCalendarDays,
    HiOutlineDocumentArrowDown,
    HiOutlineFunnel,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { adminService } from '../../services/adminService';
import type {
    CamXuc,
    ExportDownloadMeta,
    ExportFileFormat,
    ExportPreviewItem,
} from '../../types';
import './AdminPages.css';

const PREVIEW_PAGE_SIZE = 10;

const isAbortError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const maybeAxios = error as { code?: string; name?: string };
    return maybeAxios.code === 'ERR_CANCELED' || maybeAxios.name === 'CanceledError';
};

const ExportPage: React.FC = () => {
    const previewCacheRef = useRef(new Map<string, { items: ExportPreviewItem[]; total: number }>());
    const activePreviewRequestRef = useRef<AbortController | null>(null);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sentiment, setSentiment] = useState('');
    const [fileFormat, setFileFormat] = useState<ExportFileFormat>('csv');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    const [previewItems, setPreviewItems] = useState<ExportPreviewItem[]>([]);
    const [previewTotal, setPreviewTotal] = useState(0);
    const [previewPage, setPreviewPage] = useState(1);

    const [lastExport, setLastExport] = useState<ExportDownloadMeta | null>(null);

    useEffect(() => {
        return () => {
            activePreviewRequestRef.current?.abort();
        };
    }, []);

    const validateDateRange = useCallback(() => {
        if (startDate && endDate && startDate > endDate) {
            toast.error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
            return false;
        }
        return true;
    }, [endDate, startDate]);

    const buildPreviewCacheKey = useCallback((page: number) => {
        return `${page}|${startDate}|${endDate}|${sentiment}`;
    }, [endDate, sentiment, startDate]);

    const handleFilter = useCallback(async (page = 1) => {
        if (!validateDateRange()) return;

        const cacheKey = buildPreviewCacheKey(page);
        const cached = previewCacheRef.current.get(cacheKey);
        if (cached) {
            setPreviewItems(cached.items);
            setPreviewTotal(cached.total);
            setPreviewPage(page);
            return;
        }

        activePreviewRequestRef.current?.abort();
        const controller = new AbortController();
        activePreviewRequestRef.current = controller;

        setPreviewLoading(true);
        try {
            const res = await adminService.getExportPreview({
                page,
                page_size: PREVIEW_PAGE_SIZE,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                sentiment: (sentiment || undefined) as CamXuc | undefined,
            }, controller.signal);

            if (controller.signal.aborted) return;

            previewCacheRef.current.set(cacheKey, {
                items: res.items,
                total: res.total,
            });

            setPreviewItems(res.items);
            setPreviewTotal(res.total);
            setPreviewPage(page);
            toast.success(`Đã lọc ${res.total} dòng dữ liệu.`);
        } catch (err: unknown) {
            if (isAbortError(err)) return;
            const error = err as AxiosError<{ detail?: string }>;
            toast.error(error.response?.data?.detail || 'Không lọc được dữ liệu preview.');
        } finally {
            if (activePreviewRequestRef.current === controller) {
                setPreviewLoading(false);
            }
        }
    }, [buildPreviewCacheKey, endDate, sentiment, startDate, validateDateRange]);

    const handleExport = useCallback(async () => {
        if (!validateDateRange()) return;

        setExportLoading(true);

        try {
            const { blob, meta } = await adminService.downloadExportFile({
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                sentiment: (sentiment || undefined) as CamXuc | undefined,
                file_format: fileFormat,
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = meta.file;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setLastExport(meta);
            toast.success(`Xuất file thành công: ${meta.sodong} dòng.`);
        } catch (err: unknown) {
            const error = err as AxiosError<{ detail?: string }>;
            toast.error(error.response?.data?.detail || 'Xuất file thất bại.');
        } finally {
            setExportLoading(false);
        }
    }, [endDate, fileFormat, sentiment, startDate, validateDateRange]);

    const previewTotalPages = useMemo(
        () => Math.max(1, Math.ceil(previewTotal / PREVIEW_PAGE_SIZE)),
        [previewTotal],
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineArrowDownTray /> Xuất dữ liệu</h1>
                <p>Lọc dữ liệu, xem preview trước khi export và theo dõi lịch sử xuất.</p>
            </div>

            <div className="export-action-card glass-card-static animate-fade-in-up stagger-1">
                <div className="export-action-content">
                    <HiOutlineDocumentArrowDown size={40} className="export-icon" />
                    <div>
                        <h3>Xuất dữ liệu cốt lõi</h3>
                        <p>
                            Hệ thống lấy dữ liệu từ vanban, ketqua, suanhan; ưu tiên nhãn chỉnh sửa nếu có.
                            File xuất gồm: nội dung văn bản, cảm xúc, độ tin cậy, model AI, thời gian phân tích.
                        </p>
                    </div>
                </div>

                <div className="export-form-grid">
                    <label className="export-field">
                        <span><HiOutlineCalendarDays /> Từ ngày</span>
                        <input
                            type="date"
                            className="input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </label>

                    <label className="export-field">
                        <span><HiOutlineCalendarDays /> Đến ngày</span>
                        <input
                            type="date"
                            className="input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </label>

                    <label className="export-field">
                        <span>Cảm xúc</span>
                        <select
                            className="input"
                            value={sentiment}
                            onChange={(e) => setSentiment(e.target.value)}
                        >
                            <option value="">Tất cả</option>
                            <option value="negative">negative</option>
                            <option value="neutral">neutral</option>
                            <option value="positive">positive</option>
                        </select>
                    </label>

                    <label className="export-field">
                        <span>Định dạng file</span>
                        <select
                            className="input"
                            value={fileFormat}
                            onChange={(e) => setFileFormat(e.target.value as ExportFileFormat)}
                        >
                            <option value="csv">CSV</option>
                            <option value="xlsx">Excel (.xlsx)</option>
                        </select>
                    </label>
                </div>

                <div className="export-action-buttons">
                    <button className="btn btn-secondary btn-lg" onClick={() => handleFilter(1)} disabled={previewLoading}>
                        {previewLoading ? (
                            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang lọc...</>
                        ) : (
                            <><HiOutlineFunnel /> Lọc</>
                        )}
                    </button>

                    <button className="btn btn-primary btn-lg" onClick={handleExport} disabled={exportLoading}>
                        {exportLoading ? (
                            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang xuất...</>
                        ) : (
                            <><HiOutlineArrowDownTray /> Xuất file</>
                        )}
                    </button>
                </div>
            </div>

            <div className="admin-table-wrapper glass-card-static animate-fade-in-up stagger-2">
                <div className="export-section-title">
                    <h3>Preview dữ liệu sắp export</h3>
                    <span>{previewTotal} dòng</span>
                </div>
                <div className="users-table-container">
                    <table className="users-table export-preview-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Nội dung văn bản</th>
                                <th>Cảm xúc</th>
                                <th>Độ tin cậy</th>
                                <th>Model AI</th>
                                <th>Thời gian phân tích</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewItems.length === 0 && !previewLoading && (
                                <tr>
                                    <td colSpan={6} className="export-empty">Bấm Lọc để xem dữ liệu preview.</td>
                                </tr>
                            )}
                            {previewItems.map((item, idx) => (
                                <tr key={`${item.thoigian_phan_tich || 'none'}-${idx}`}>
                                    <td className="admin-td-id">#{(previewPage - 1) * PREVIEW_PAGE_SIZE + idx + 1}</td>
                                    <td className="admin-td-text">{item.noidung}</td>
                                    <td>{item.camxuc ? <span className={`badge badge-${item.camxuc}`}>{item.camxuc}</span> : '-'}</td>
                                    <td className="admin-td-confidence">{item.tincay != null ? `${(item.tincay * 100).toFixed(2)}%` : '-'}</td>
                                    <td>{item.model_ai || '-'}</td>
                                    <td className="admin-td-date">
                                        {item.thoigian_phan_tich ? new Date(item.thoigian_phan_tich).toLocaleString('vi-VN') : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {previewTotal > 0 && (
                    <div className="pagination">
                        <button className="pagination-btn" disabled={previewPage <= 1 || previewLoading} onClick={() => handleFilter(previewPage - 1)}>
                            {'<'}
                        </button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            Trang {previewPage} / {previewTotalPages}
                        </span>
                        <button className="pagination-btn" disabled={previewPage >= previewTotalPages || previewLoading} onClick={() => handleFilter(previewPage + 1)}>
                            {'>'}
                        </button>
                    </div>
                )}
            </div>

            {lastExport && (
                <div className="export-info glass-card-static animate-fade-in-up stagger-2">
                    <span>ID xuất: <strong>#{lastExport.xd_id}</strong></span>
                    <span>Tên file: <strong>{lastExport.file}</strong></span>
                    <span>Số dòng: <strong>{lastExport.sodong}</strong></span>
                </div>
            )}
        </div>
    );
};

export default ExportPage;
