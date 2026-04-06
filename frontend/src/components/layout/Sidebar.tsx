/* ═══════════════════════════════════════════════════
   Sidebar layout component
   ═══════════════════════════════════════════════════ */

import React, { memo, useCallback, useMemo, useState } from 'react';
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

interface SidebarProps {
    collapsed: boolean;
    mobileOpen: boolean;
    isMobile: boolean;
    onToggleCollapsed: () => void;
    onToggleMobile: () => void;
    onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    collapsed,
    mobileOpen,
    isMobile,
    onToggleCollapsed,
    onToggleMobile,
    onCloseMobile,
}) => {
    const { role, user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = useCallback(() => {
        setShowLogoutConfirm(false);
        onCloseMobile();
        logout();
        navigate('/login');
    }, [logout, navigate, onCloseMobile]);

    const userLinks = useMemo(
        () => [
            { to: '/home', icon: <HiOutlineHome />, label: 'Phân tích' },
            { to: '/history', icon: <HiOutlineClock />, label: 'Lịch sử' },
            { to: '/profile', icon: <HiOutlineUser />, label: 'Hồ sơ' },
        ],
        [],
    );

    const adminLinks = useMemo(
        () => [
            { to: '/admin/dashboard', icon: <HiOutlineChartBar />, label: 'Dashboard' },
            { to: '/admin/users', icon: <HiOutlineUsers />, label: 'Người dùng' },
            { to: '/admin/texts', icon: <HiOutlineDocumentText />, label: 'Văn bản' },
            { to: '/admin/labels', icon: <HiOutlineTag />, label: 'Nhãn cảm xúc' },
            { to: '/admin/test-model', icon: <HiOutlineBeaker />, label: 'Test Model' },
            { to: '/admin/export', icon: <HiOutlineArrowDownTray />, label: 'Xuất dữ liệu' },
        ],
        [],
    );

    const userInitial = useMemo(
        () => (user?.tk_email?.[0] || user?.tk_sdt?.[0] || 'U').toUpperCase(),
        [user?.tk_email, user?.tk_sdt],
    );

    const userDisplay = useMemo(() => user?.tk_email || user?.tk_sdt || 'User', [user?.tk_email, user?.tk_sdt]);

    const handleNavClick = useCallback(() => {
        if (mobileOpen) {
            onCloseMobile();
        }
    }, [mobileOpen, onCloseMobile]);

    const handleThemeToggle = useCallback(() => {
        toggleTheme();
        if (mobileOpen) {
            onCloseMobile();
        }
    }, [mobileOpen, onCloseMobile, toggleTheme]);

    return (
        <>
            {/* Mobile toggle */}
            <button
                className="sidebar-mobile-toggle btn-icon"
                onClick={onToggleMobile}
                aria-label="Toggle sidebar"
                aria-expanded={mobileOpen}
                aria-controls="app-sidebar"
            >
                {mobileOpen ? <HiOutlineXMark size={22} /> : <HiOutlineBars3 size={22} />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={onCloseMobile} />
            )}

            <aside id="app-sidebar" className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <img src={logoImg} alt="SentimentAI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        {!collapsed && <span className="sidebar-logo-text">SentimentAI</span>}
                    </div>
                    {!isMobile && (
                        <button
                            className="sidebar-collapse-btn btn-icon"
                            onClick={onToggleCollapsed}
                            aria-label="Collapse sidebar"
                        >
                            <HiOutlineBars3 size={18} />
                        </button>
                    )}
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
                            onClick={handleNavClick}
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
                                    onClick={handleNavClick}
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
                    <button className="sidebar-link" onClick={handleThemeToggle} title="Toggle theme">
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
                                {userInitial}
                            </div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name truncate">
                                    {userDisplay}
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

export default memo(Sidebar);
