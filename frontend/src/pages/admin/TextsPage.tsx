/* ═══════════════════════════════════════════════════
   Admin Texts Page – Manage all user-submitted texts
   Features: list, search, paginate, delete (soft)
   ═══════════════════════════════════════════════════ */

import React, {
    Profiler,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ProfilerOnRenderCallback } from 'react';
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
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTableVirtualizer } from '../../hooks/useTableVirtualizer';
import toast from 'react-hot-toast';
import './AdminPages.css';

const PAGE_SIZE = 120;
const VIRTUAL_ROW_HEIGHT = 60;
const VIRTUALIZATION_THRESHOLD = 35;

const sentimentConfig: Record<CamXuc, { icon: React.ReactNode; label: string; class: string }> = {
    positive: { icon: <HiOutlineFaceSmile />, label: 'Tích cực', class: 'positive' },
    negative: { icon: <HiOutlineFaceFrown />, label: 'Tiêu cực', class: 'negative' },
    neutral: { icon: <HiOutlineMinusCircle />, label: 'Trung tính', class: 'neutral' },
};

const TEXTS_TABLE_PROFILER: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
) => {
    if (!import.meta.env.DEV) return;
    if (actualDuration < 8) return;
    console.info(`[Profiler:${id}] ${phase} commit: ${actualDuration.toFixed(2)}ms`);
};

const isAbortError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const maybeAxios = error as { code?: string; name?: string };
    return maybeAxios.code === 'ERR_CANCELED' || maybeAxios.name === 'CanceledError';
};

const getApiErrorDetail = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const maybeAxios = error as { response?: { data?: { detail?: string } } };
    return maybeAxios.response?.data?.detail;
};

interface TextRowProps {
    item: AdminTextItem;
    onView: (text: string) => void;
    onDelete: (vbId: number) => void;
    formatDate: (value: string | null) => string;
}

const TextRow = memo(({ item, onView, onDelete, formatDate }: TextRowProps) => {
    const config = item.camxuc_ai ? sentimentConfig[item.camxuc_ai] : null;

    return (
        <tr>
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
                {item.tincay != null ? `${(item.tincay * 100).toFixed(1)}%` : '—'}
            </td>
            <td className="admin-td-date">{formatDate(item.vb_taoluc)}</td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', minHeight: '40px' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onView(item.noidung)}
                        title="Xem chi tiết"
                    >
                        <HiOutlineEye size={18} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm btn-delete"
                        style={{ color: 'var(--negative)' }}
                        onClick={() => onDelete(item.vb_id)}
                        title="Xóa văn bản"
                    >
                        <HiOutlineTrash size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
});

TextRow.displayName = 'TextRow';

const TextsPage: React.FC = () => {
    const cacheRef = useRef(new Map<string, { items: AdminTextItem[]; total: number; total_pages: number }>());
    const activeRequestRef = useRef<AbortController | null>(null);
    const tableContainerRef = useRef<HTMLDivElement | null>(null);

    const [items, setItems] = useState<AdminTextItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(searchInput.trim(), 260);

    // Confirm dialog
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    // View dialog
    const [viewText, setViewText] = useState<string | null>(null);

    useEffect(() => {
        setSearch(debouncedSearch);
    }, [debouncedSearch]);

    const queryKey = useMemo(() => `${page}|${search}`, [page, search]);

    const fetchTexts = useCallback(async (force = false) => {
        const cached = cacheRef.current.get(queryKey);
        if (!force && cached) {
            setItems(cached.items);
            setTotal(cached.total);
            setTotalPages(cached.total_pages);
            setLoading(false);
            return;
        }

        activeRequestRef.current?.abort();
        const controller = new AbortController();
        activeRequestRef.current = controller;

        setLoading(true);
        try {
            const params: { page: number; page_size: number; search?: string } = {
                page,
                page_size: PAGE_SIZE,
            };
            if (search.trim()) params.search = search.trim();

            const res = await adminService.getTexts(params, controller.signal);
            if (controller.signal.aborted) return;

            cacheRef.current.set(queryKey, {
                items: res.items,
                total: res.total,
                total_pages: res.total_pages,
            });

            setItems(res.items);
            setTotal(res.total);
            setTotalPages(res.total_pages);
        } catch (error) {
            if (isAbortError(error)) return;
            toast.error('Không thể tải danh sách văn bản.');
        } finally {
            if (activeRequestRef.current === controller) {
                setLoading(false);
            }
        }
    }, [page, queryKey, search]);

    useEffect(() => {
        void fetchTexts();
        return () => {
            activeRequestRef.current?.abort();
        };
    }, [fetchTexts]);

    const handleDelete = async (vbId: number) => {
        try {
            await adminService.deleteText(vbId);
            toast.success('Đã xóa văn bản.');
            setConfirmDeleteId(null);
            cacheRef.current.clear();
            await fetchTexts(true);
        } catch (err: unknown) {
            toast.error(getApiErrorDetail(err) || 'Lỗi khi xóa văn bản.');
        }
    };

    const formatDate = useCallback((d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }, []);

    const handleResetSearch = useCallback(() => {
        setSearchInput('');
        setPage(1);
    }, []);

    const virtualizer = useTableVirtualizer({
        containerRef: tableContainerRef,
        itemCount: items.length,
        rowHeight: VIRTUAL_ROW_HEIGHT,
        overscan: 8,
        enabled: items.length >= VIRTUALIZATION_THRESHOLD,
    });

    const renderedItems = useMemo(
        () => (virtualizer.enabled ? items.slice(virtualizer.startIndex, virtualizer.endIndex) : items),
        [items, virtualizer.enabled, virtualizer.endIndex, virtualizer.startIndex],
    );

    const paginationNumbers = useMemo(() => {
        const maxButtons = 7;
        const length = Math.min(totalPages, maxButtons);
        return Array.from({ length }, (_, i) => {
            if (totalPages <= maxButtons) return i + 1;
            if (page <= 4) return i + 1;
            if (page >= totalPages - 3) return totalPages - 6 + i;
            return page - 3 + i;
        });
    }, [page, totalPages]);

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
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="users-filters">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleResetSearch}
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
                    <div ref={tableContainerRef} className="users-table-container users-table-virtual-scroll">
                        {import.meta.env.DEV ? (
                            <Profiler id="AdminTextsTable" onRender={TEXTS_TABLE_PROFILER}>
                                <table className="table users-table users-table-virtualized">
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
                                        {virtualizer.enabled && virtualizer.paddingTop > 0 && (
                                            <tr className="virtual-spacer-row" aria-hidden="true">
                                                <td colSpan={7} style={{ height: `${virtualizer.paddingTop}px` }} />
                                            </tr>
                                        )}

                                        {renderedItems.map((item) => (
                                            <TextRow
                                                key={item.vb_id}
                                                item={item}
                                                onView={setViewText}
                                                onDelete={setConfirmDeleteId}
                                                formatDate={formatDate}
                                            />
                                        ))}

                                        {virtualizer.enabled && virtualizer.paddingBottom > 0 && (
                                            <tr className="virtual-spacer-row" aria-hidden="true">
                                                <td colSpan={7} style={{ height: `${virtualizer.paddingBottom}px` }} />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </Profiler>
                        ) : (
                            <table className="table users-table users-table-virtualized">
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
                                    {virtualizer.enabled && virtualizer.paddingTop > 0 && (
                                        <tr className="virtual-spacer-row" aria-hidden="true">
                                            <td colSpan={7} style={{ height: `${virtualizer.paddingTop}px` }} />
                                        </tr>
                                    )}

                                    {renderedItems.map((item) => (
                                        <TextRow
                                            key={item.vb_id}
                                            item={item}
                                            onView={setViewText}
                                            onDelete={setConfirmDeleteId}
                                            formatDate={formatDate}
                                        />
                                    ))}

                                    {virtualizer.enabled && virtualizer.paddingBottom > 0 && (
                                        <tr className="virtual-spacer-row" aria-hidden="true">
                                            <td colSpan={7} style={{ height: `${virtualizer.paddingBottom}px` }} />
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
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
                    {paginationNumbers.map((pageNum) => (
                        <button
                            key={pageNum}
                            className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                            onClick={() => setPage(pageNum)}
                        >
                            {pageNum}
                        </button>
                    ))}
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





