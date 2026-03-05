/* ═══════════════════════════════════════════════════
   Admin Users Page – Full user management
   Features: list, search, filter, change role, lock/unlock
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
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
import toast from 'react-hot-toast';
import './AdminPages.css';

const PAGE_SIZE = 10;

const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUserItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Confirm dialog
    const [confirmAction, setConfirmAction] = useState<{
        type: 'role' | 'lock' | 'unlock' | 'delete';
        userId: number;
        label: string;
        value?: string;
    } | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, page_size: PAGE_SIZE };
            if (search.trim()) params.search = search.trim();
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            const res = await adminService.getUsers(params);
            setUsers(res.items);
            setTotal(res.total);
            setTotalPages(res.total_pages);
        } catch {
            toast.error('Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter, statusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await adminService.updateUserRole(userId, newRole);
            toast.success('Đã cập nhật vai trò.');
            setConfirmAction(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi cập nhật vai trò.');
        }
    };

    const handleStatusChange = async (userId: number, lock: boolean) => {
        try {
            await adminService.updateUserStatus(userId, lock);
            toast.success(lock ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
            setConfirmAction(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi cập nhật trạng thái.');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            await adminService.deleteUser(userId);
            toast.success('Đã xóa tài khoản.');
            setConfirmAction(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi xóa tài khoản.');
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
                        onChange={(e) => setSearchInput(e.target.value)}
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
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchInput(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}>
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
                    <div className="users-table-container">
                        <table className="table users-table">
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
                                {users.map((u) => {
                                    const isSelf = currentUser && u.tk_id === currentUser.tk_id;
                                    return (
                                        <tr key={u.tk_id} className={u.tk_xoa ? 'users-row-locked' : ''}>
                                            <td className="admin-td-id">#{u.tk_id}</td>
                                            <td>
                                                <div className="users-contact">
                                                    {u.tk_email && (
                                                        <span className="users-contact-item">
                                                            <HiOutlineEnvelope size={13} />
                                                            {u.tk_email}
                                                        </span>
                                                    )}
                                                    {u.tk_sdt && (
                                                        <span className="users-contact-item">
                                                            <HiOutlinePhone size={13} />
                                                            {u.tk_sdt}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-role badge-role-${u.tk_vaitro}`}>
                                                    <HiOutlineShieldCheck size={12} />
                                                    {u.tk_vaitro === 'admin' ? 'Admin' : 'User'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.tk_xoa ? 'badge-negative' : 'badge-positive'}`}>
                                                    {u.tk_xoa ? 'Đã khóa' : 'Hoạt động'}
                                                </span>
                                            </td>
                                            <td className="admin-td-confidence">{u.tong_vanban}</td>
                                            <td className="admin-td-date">{formatDate(u.tk_taoluc)}</td>
                                            <td className="admin-td-date">{formatDate(u.tk_loginluc)}</td>
                                            <td>
                                                <div className="users-actions">
                                                    {/* Change role */}
                                                    <select
                                                        className="input users-action-select"
                                                        value={u.tk_vaitro}
                                                        disabled={!!isSelf}
                                                        onChange={(e) => setConfirmAction({
                                                            type: 'role',
                                                            userId: u.tk_id,
                                                            label: `Đổi vai trò ${u.tk_email || u.tk_sdt} thành "${e.target.value}"?`,
                                                            value: e.target.value,
                                                        })}
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>

                                                    {/* Lock/Unlock */}
                                                    {!isSelf && (
                                                        <button
                                                            className={`btn btn-sm ${u.tk_xoa ? 'btn-ghost users-btn-lock' : 'btn-ghost users-btn-lock'}`}
                                                            title={u.tk_xoa ? 'Mở khóa' : 'Khóa tài khoản'}
                                                            onClick={() => setConfirmAction({
                                                                type: u.tk_xoa ? 'unlock' : 'lock',
                                                                userId: u.tk_id,
                                                                label: u.tk_xoa
                                                                    ? `Mở khóa tài khoản ${u.tk_email || u.tk_sdt}?`
                                                                    : `Khóa tài khoản ${u.tk_email || u.tk_sdt}?`,
                                                            })}
                                                        >
                                                            {u.tk_xoa ? 
                                                                <HiOutlineLockOpen size={18} className="users-icon-lock" /> : 
                                                                <HiOutlineLockClosed size={18} className="users-icon-lock" />
                                                            }
                                                        </button>
                                                    )}

                                                    {/* Delete */}
                                                    {!isSelf && (
                                                        <button
                                                            className="btn btn-sm btn-ghost users-btn-delete"
                                                            title="Xóa tài khoản"
                                                            onClick={() => setConfirmAction({
                                                                type: 'delete',
                                                                userId: u.tk_id,
                                                                label: `Xóa vĩnh viễn tài khoản ${u.tk_email || u.tk_sdt}? Toàn bộ dữ liệu liên quan sẽ bị xóa.`,
                                                            })}
                                                        >
                                                            <HiOutlineTrash size={18} className="users-icon-delete" />
                                                        </button>
                                                    )}
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
