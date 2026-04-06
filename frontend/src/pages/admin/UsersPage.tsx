/* ═══════════════════════════════════════════════════
   Admin Users Page – Full user management
   Features: list, search, filter, change role, lock/unlock
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
    HiOutlineUsers,
    HiOutlineMagnifyingGlass,
    HiOutlineShieldCheck,
    HiOutlineLockClosed,
    HiOutlineLockOpen,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineFunnel,
    HiOutlineArrowPath,
    HiOutlineTrash,
} from 'react-icons/hi2';
import { adminService, type AdminUserItem } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTableVirtualizer } from '../../hooks/useTableVirtualizer';
import toast from 'react-hot-toast';
import './AdminPages.css';

const PAGE_SIZE = 100;
const VIRTUAL_ROW_HEIGHT = 62;
const VIRTUALIZATION_THRESHOLD = 30;

type ConfirmAction = {
    type: 'role' | 'lock' | 'unlock' | 'delete';
    userId: number;
    label: string;
    value?: string;
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

const USERS_TABLE_PROFILER: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
) => {
    if (!import.meta.env.DEV) return;
    if (actualDuration < 8) return;
    console.info(`[Profiler:${id}] ${phase} commit: ${actualDuration.toFixed(2)}ms`);
};

interface UserRowProps {
    user: AdminUserItem;
    isSelf: boolean;
    onRoleRequest: (userId: number, label: string, value: string) => void;
    onStatusRequest: (userId: number, lock: boolean, label: string) => void;
    onDeleteRequest: (userId: number, label: string) => void;
    formatDate: (value: string | null) => string;
}

const UserRow = memo(({
    user,
    isSelf,
    onRoleRequest,
    onStatusRequest,
    onDeleteRequest,
    formatDate,
}: UserRowProps) => {
    const userLabel = user.tk_email || user.tk_sdt || `#${user.tk_id}`;

    return (
        <tr className={user.tk_xoa ? 'users-row-locked' : ''}>
            <td className="admin-td-id">#{user.tk_id}</td>
            <td>
                <div className="users-contact">
                    {user.tk_email && (
                        <span className="users-contact-item">
                            <HiOutlineEnvelope size={13} />
                            {user.tk_email}
                        </span>
                    )}
                    {user.tk_sdt && (
                        <span className="users-contact-item">
                            <HiOutlinePhone size={13} />
                            {user.tk_sdt}
                        </span>
                    )}
                </div>
            </td>
            <td>
                <span className={`badge badge-role badge-role-${user.tk_vaitro}`}>
                    <HiOutlineShieldCheck size={12} />
                    {user.tk_vaitro === 'admin' ? 'Admin' : 'User'}
                </span>
            </td>
            <td>
                <span className={`badge ${user.tk_xoa ? 'badge-negative' : 'badge-positive'}`}>
                    {user.tk_xoa ? 'Đã khóa' : 'Hoạt động'}
                </span>
            </td>
            <td className="admin-td-confidence">{user.tong_vanban}</td>
            <td className="admin-td-date">{formatDate(user.tk_taoluc)}</td>
            <td className="admin-td-date">{formatDate(user.tk_loginluc)}</td>
            <td>
                <div className="users-actions">
                    <select
                        className="input users-action-select"
                        value={user.tk_vaitro}
                        disabled={isSelf}
                        onChange={(e) => onRoleRequest(user.tk_id, `Đổi vai trò ${userLabel} thành "${e.target.value}"?`, e.target.value)}
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>

                    {!isSelf && (
                        <button
                            className="btn btn-sm btn-ghost users-btn-lock"
                            title={user.tk_xoa ? 'Mở khóa' : 'Khóa tài khoản'}
                            onClick={() => onStatusRequest(
                                user.tk_id,
                                !user.tk_xoa,
                                user.tk_xoa
                                    ? `Mở khóa tài khoản ${userLabel}?`
                                    : `Khóa tài khoản ${userLabel}?`,
                            )}
                        >
                            {user.tk_xoa
                                ? <HiOutlineLockOpen size={18} className="users-icon-lock" />
                                : <HiOutlineLockClosed size={18} className="users-icon-lock" />}
                        </button>
                    )}

                    {!isSelf && (
                        <button
                            className="btn btn-sm btn-ghost users-btn-delete"
                            title="Xóa tài khoản"
                            onClick={() => onDeleteRequest(
                                user.tk_id,
                                `Xóa vĩnh viễn tài khoản ${userLabel}? Toàn bộ dữ liệu liên quan sẽ bị xóa.`,
                            )}
                        >
                            <HiOutlineTrash size={18} className="users-icon-delete" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

UserRow.displayName = 'UserRow';

const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const usersCacheRef = useRef(new Map<string, { items: AdminUserItem[]; total: number; total_pages: number }>());
    const activeRequestRef = useRef<AbortController | null>(null);
    const tableContainerRef = useRef<HTMLDivElement | null>(null);

    const [users, setUsers] = useState<AdminUserItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebouncedValue(searchInput.trim(), 260);

    // Confirm dialog
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

    useEffect(() => {
        setSearch(debouncedSearch);
    }, [debouncedSearch]);

    const queryKey = useMemo(() => {
        return `${page}|${search}|${roleFilter}|${statusFilter}`;
    }, [page, roleFilter, search, statusFilter]);

    const fetchUsers = useCallback(async (force = false) => {
        const cached = usersCacheRef.current.get(queryKey);
        if (!force && cached) {
            setUsers(cached.items);
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
            const params: {
                page: number;
                page_size: number;
                search?: string;
                role?: string;
                status?: string;
            } = { page, page_size: PAGE_SIZE };

            if (search.trim()) params.search = search.trim();
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await adminService.getUsers(params, controller.signal);
            if (controller.signal.aborted) return;

            usersCacheRef.current.set(queryKey, {
                items: res.items,
                total: res.total,
                total_pages: res.total_pages,
            });

            setUsers(res.items);
            setTotal(res.total);
            setTotalPages(res.total_pages);
        } catch (error) {
            if (isAbortError(error)) return;
            toast.error('Không thể tải danh sách người dùng.');
        } finally {
            if (activeRequestRef.current === controller) {
                setLoading(false);
            }
        }
    }, [page, queryKey, roleFilter, search, statusFilter]);

    useEffect(() => {
        void fetchUsers();
        return () => {
            activeRequestRef.current?.abort();
        };
    }, [fetchUsers]);

    const invalidateCache = useCallback(() => {
        usersCacheRef.current.clear();
    }, []);

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await adminService.updateUserRole(userId, newRole);
            toast.success('Đã cập nhật vai trò.');
            setConfirmAction(null);
            invalidateCache();
            await fetchUsers(true);
        } catch (err: unknown) {
            toast.error(getApiErrorDetail(err) || 'Lỗi cập nhật vai trò.');
        }
    };

    const handleStatusChange = async (userId: number, lock: boolean) => {
        try {
            await adminService.updateUserStatus(userId, lock);
            toast.success(lock ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
            setConfirmAction(null);
            invalidateCache();
            await fetchUsers(true);
        } catch (err: unknown) {
            toast.error(getApiErrorDetail(err) || 'Lỗi cập nhật trạng thái.');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            await adminService.deleteUser(userId);
            toast.success('Đã xóa tài khoản.');
            setConfirmAction(null);
            invalidateCache();
            await fetchUsers(true);
        } catch (err: unknown) {
            toast.error(getApiErrorDetail(err) || 'Lỗi xóa tài khoản.');
        }
    };

    const formatDate = useCallback((d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }, []);

    const requestRoleChange = useCallback((userId: number, label: string, value: string) => {
        setConfirmAction({ type: 'role', userId, label, value });
    }, []);

    const requestStatusChange = useCallback((userId: number, lock: boolean, label: string) => {
        setConfirmAction({ type: lock ? 'lock' : 'unlock', userId, label });
    }, []);

    const requestDeleteUser = useCallback((userId: number, label: string) => {
        setConfirmAction({ type: 'delete', userId, label });
    }, []);

    const handleResetFilters = useCallback(() => {
        setSearchInput('');
        setRoleFilter('');
        setStatusFilter('');
        setPage(1);
    }, []);

    const virtualizer = useTableVirtualizer({
        containerRef: tableContainerRef,
        itemCount: users.length,
        rowHeight: VIRTUAL_ROW_HEIGHT,
        overscan: 8,
        enabled: users.length >= VIRTUALIZATION_THRESHOLD,
    });

    const visibleUsers = useMemo(() => {
        return users.slice(virtualizer.startIndex, virtualizer.endIndex);
    }, [users, virtualizer.endIndex, virtualizer.startIndex]);

    const renderedRows = virtualizer.enabled ? visibleUsers : users;

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineUsers /> Quản lý người dùng</h1>
                <p>Danh sách, tìm kiếm, phân quyền và quản lý trạng thái tài khoản</p>
            </div>

            {/* ── Stats row ─────────────────────────── */}
            <div className="users-stats animate-fade-in-up stagger-1">
                <div className="users-stat-card glass-card-static">
                    <span className="users-stat-value">{total}</span>
                    <span className="users-stat-label">Tổng tài khoản</span>
                </div>
            </div>

            {/* ── Toolbar ──────────────────────────── */}
            <div className="users-toolbar glass-card-static animate-fade-in-up stagger-2">
                <div className="users-search-box">
                    <HiOutlineMagnifyingGlass className="users-search-icon" />
                    <input
                        type="text"
                        className="input users-search-input"
                        placeholder="Tìm theo email hoặc SĐT..."
                        value={searchInput}
                        onChange={(e) => {
                            setSearchInput(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="users-filters">
                    <div className="users-filter-group">
                        <HiOutlineFunnel size={14} />
                        <select
                            className="input users-filter-select"
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">Tất cả vai trò</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="users-filter-group">
                        <select
                            className="input users-filter-select"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">Hoạt động</option>
                            <option value="locked">Đã khóa</option>
                        </select>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={handleResetFilters}>
                        <HiOutlineArrowPath size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* ── Table ─────────────────────────────── */}
            <div className="admin-table-wrapper glass-card-static animate-fade-in-up stagger-3">
                {loading ? (
                    <div className="users-table-loading"><div className="spinner" /></div>
                ) : users.length === 0 ? (
                    <div className="users-empty">
                        <HiOutlineUsers size={48} />
                        <p>Không tìm thấy người dùng nào.</p>
                    </div>
                ) : (
                    <div ref={tableContainerRef} className="users-table-container users-table-virtual-scroll">
                        {import.meta.env.DEV ? (
                            <Profiler id="AdminUsersTable" onRender={USERS_TABLE_PROFILER}>
                                <table className="table users-table users-table-virtualized">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Liên hệ</th>
                                            <th>Vai trò</th>
                                            <th>Trạng thái</th>
                                            <th>Văn bản</th>
                                            <th>Ngày tạo</th>
                                            <th>Đăng nhập cuối</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {virtualizer.enabled && virtualizer.paddingTop > 0 && (
                                            <tr className="virtual-spacer-row" aria-hidden="true">
                                                <td colSpan={8} style={{ height: `${virtualizer.paddingTop}px` }} />
                                            </tr>
                                        )}

                                        {renderedRows.map((u) => {
                                            const isSelf = !!currentUser && u.tk_id === currentUser.tk_id;
                                            return (
                                                <UserRow
                                                    key={u.tk_id}
                                                    user={u}
                                                    isSelf={isSelf}
                                                    onRoleRequest={requestRoleChange}
                                                    onStatusRequest={requestStatusChange}
                                                    onDeleteRequest={requestDeleteUser}
                                                    formatDate={formatDate}
                                                />
                                            );
                                        })}

                                        {virtualizer.enabled && virtualizer.paddingBottom > 0 && (
                                            <tr className="virtual-spacer-row" aria-hidden="true">
                                                <td colSpan={8} style={{ height: `${virtualizer.paddingBottom}px` }} />
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
                                        <th>Liên hệ</th>
                                        <th>Vai trò</th>
                                        <th>Trạng thái</th>
                                        <th>Văn bản</th>
                                        <th>Ngày tạo</th>
                                        <th>Đăng nhập cuối</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {virtualizer.enabled && virtualizer.paddingTop > 0 && (
                                        <tr className="virtual-spacer-row" aria-hidden="true">
                                            <td colSpan={8} style={{ height: `${virtualizer.paddingTop}px` }} />
                                        </tr>
                                    )}

                                    {renderedRows.map((u) => {
                                        const isSelf = !!currentUser && u.tk_id === currentUser.tk_id;
                                        return (
                                            <UserRow
                                                key={u.tk_id}
                                                user={u}
                                                isSelf={isSelf}
                                                onRoleRequest={requestRoleChange}
                                                onStatusRequest={requestStatusChange}
                                                onDeleteRequest={requestDeleteUser}
                                                formatDate={formatDate}
                                            />
                                        );
                                    })}

                                    {virtualizer.enabled && virtualizer.paddingBottom > 0 && (
                                        <tr className="virtual-spacer-row" aria-hidden="true">
                                            <td colSpan={8} style={{ height: `${virtualizer.paddingBottom}px` }} />
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
                <div className="users-pagination animate-fade-in-up stagger-4">
                    <button
                        className="btn btn-ghost btn-sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        <HiOutlineChevronLeft size={16} />
                    </button>
                    <span className="users-pagination-info">
                        Trang <strong>{page}</strong> / {totalPages} ({total} tài khoản)
                    </span>
                    <button
                        className="btn btn-ghost btn-sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        <HiOutlineChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* ── Confirm Dialog ────────────────────── */}
            {confirmAction && (
                <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Xác nhận</h3>
                        <p>{confirmAction.label}</p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>
                                Hủy
                            </button>
                            <button
                                className={`btn ${confirmAction.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => {
                                    if (confirmAction.type === 'role' && confirmAction.value) {
                                        handleRoleChange(confirmAction.userId, confirmAction.value);
                                    } else if (confirmAction.type === 'lock') {
                                        handleStatusChange(confirmAction.userId, true);
                                    } else if (confirmAction.type === 'unlock') {
                                        handleStatusChange(confirmAction.userId, false);
                                    } else if (confirmAction.type === 'delete') {
                                        handleDeleteUser(confirmAction.userId);
                                    }
                                }}
                            >
                                {confirmAction.type === 'lock' ? 'Khóa' : confirmAction.type === 'unlock' ? 'Mở khóa' : confirmAction.type === 'delete' ? 'Xóa' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
