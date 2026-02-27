/* ═══════════════════════════════════════════════════
   Sidebar layout component
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    HiOutlineHome,
    HiOutlineClock,
    HiOutlineUser,
    HiOutlineChartBar,
    HiOutlineUsers,
    HiOutlineTag,
    HiOutlineBeaker,
    HiOutlineArrowDownTray,
    HiOutlineArrowLeftOnRectangle,
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineBars3,
    HiOutlineXMark,
    HiOutlineDocumentText,
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import logoImg from '../../assets/logo sentiment.png';
import '../../pages/public/AuthPages.css'; // for confirm-overlay styles
import './Sidebar.css';

const Sidebar: React.FC = () => {
    const { role, user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        setShowLogoutConfirm(false);
        logout();
        navigate('/login');
    };

    const userLinks = [
        { to: '/home', icon: <HiOutlineHome />, label: 'Phân tích' },
        { to: '/history', icon: <HiOutlineClock />, label: 'Lịch sử' },
        { to: '/profile', icon: <HiOutlineUser />, label: 'Hồ sơ' },
    ];

    const adminLinks = [
        { to: '/admin/dashboard', icon: <HiOutlineChartBar />, label: 'Dashboard' },
        { to: '/admin/users', icon: <HiOutlineUsers />, label: 'Người dùng' },
        { to: '/admin/texts', icon: <HiOutlineDocumentText />, label: 'Văn bản' },
        { to: '/admin/labels', icon: <HiOutlineTag />, label: 'Nhãn cảm xúc' },
        { to: '/admin/test-model', icon: <HiOutlineBeaker />, label: 'Test Model' },
        { to: '/admin/export', icon: <HiOutlineArrowDownTray />, label: 'Xuất dữ liệu' },
    ];

    return (
        <>
            {/* Mobile toggle */}
            <button
                className="sidebar-mobile-toggle btn-icon"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle sidebar"
            >
                {mobileOpen ? <HiOutlineXMark size={22} /> : <HiOutlineBars3 size={22} />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <img src={logoImg} alt="SentimentAI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        {!collapsed && <span className="sidebar-logo-text">SentimentAI</span>}
                    </div>
                    <button
                        className="sidebar-collapse-btn btn-icon"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label="Collapse sidebar"
                    >
                        <HiOutlineBars3 size={18} />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="sidebar-nav">
                    {role === 'admin' && !collapsed && (
                        <div className="sidebar-section-label">Người dùng</div>
                    )}
                    {userLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                            title={link.label}
                        >
                            <span className="sidebar-link-icon">{link.icon}</span>
                            {!collapsed && <span className="sidebar-link-label">{link.label}</span>}
                        </NavLink>
                    ))}

                    {role === 'admin' && (
                        <>
                            {!collapsed && <div className="sidebar-section-label">Quản trị</div>}
                            <div className="sidebar-divider" />
                            {adminLinks.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                    title={link.label}
                                >
                                    <span className="sidebar-link-icon">{link.icon}</span>
                                    {!collapsed && <span className="sidebar-link-label">{link.label}</span>}
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className="sidebar-link" onClick={toggleTheme} title="Toggle theme">
                        <span className="sidebar-link-icon">
                            {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
                        </span>
                        {!collapsed && (
                            <span className="sidebar-link-label">{isDark ? 'Sáng' : 'Tối'}</span>
                        )}
                    </button>

                    <div className="sidebar-divider" />

                    {!collapsed && (
                        <div className="sidebar-user">
                            <div className="sidebar-user-avatar">
                                {(user?.tk_email?.[0] || user?.tk_sdt?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name truncate">
                                    {user?.tk_email || user?.tk_sdt || 'User'}
                                </span>
                                <span className="sidebar-user-role">
                                    {role === 'admin' ? 'Admin' : 'User'}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        className="sidebar-link sidebar-logout"
                        onClick={() => setShowLogoutConfirm(true)}
                        title="Đăng xuất"
                    >
                        <span className="sidebar-link-icon">
                            <HiOutlineArrowLeftOnRectangle />
                        </span>
                        {!collapsed && <span className="sidebar-link-label">Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* ── Logout Confirmation Dialog ──────────────── */}
            {showLogoutConfirm && (
                <div className="confirm-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Đăng xuất</h3>
                        <p>Bạn có chắc muốn đăng xuất khỏi hệ thống không?</p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setShowLogoutConfirm(false)}>
                                Hủy
                            </button>
                            <button className="btn btn-primary" onClick={handleLogout}>
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
