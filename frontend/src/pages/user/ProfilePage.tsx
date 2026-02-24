/* ═══════════════════════════════════════════════════
   Profile Page
   ═══════════════════════════════════════════════════ */

import React from 'react';
import {
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineShieldCheck,
    HiOutlineCalendar,
    HiOutlineFingerPrint,
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
    const { user } = useAuth();

    if (!user) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;

    const infoItems = [
        { icon: <HiOutlineFingerPrint />, label: 'ID', value: `#${user.tk_id}` },
        { icon: <HiOutlineEnvelope />, label: 'Email', value: user.tk_email || 'Không có' },
        { icon: <HiOutlinePhone />, label: 'Số điện thoại', value: user.tk_sdt || 'Không có' },
        { icon: <HiOutlineShieldCheck />, label: 'Vai trò', value: user.tk_vaitro === 'admin' ? 'Quản trị viên' : 'Người dùng' },
        { icon: <HiOutlineUser />, label: 'Đăng nhập bằng', value: user.tk_dangnhap === 'email' ? 'Email' : 'Số điện thoại' },
        {
            icon: <HiOutlineCalendar />,
            label: 'Ngày tạo',
            value: user.tk_taoluc ? new Date(user.tk_taoluc).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }) : 'Không rõ',
        },
    ];

    return (
        <div className="profile-page">
            <div className="profile-header animate-fade-in-down">
                <h1><HiOutlineUser /> Hồ sơ cá nhân</h1>
                <p>Thông tin tài khoản của bạn</p>
            </div>

            <div className="profile-card glass-card-static animate-fade-in-up stagger-1">
                <div className="profile-avatar-section">
                    <div className="profile-avatar">
                        {(user.tk_email?.[0] || user.tk_sdt?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                        <h2>{user.tk_email || user.tk_sdt}</h2>
                        <span className={`badge ${user.tk_vaitro === 'admin' ? 'badge-positive' : 'badge-neutral'}`}>
                            {user.tk_vaitro === 'admin' ? 'Admin' : 'User'}
                        </span>
                    </div>
                </div>

                <div className="profile-divider" />

                <div className="profile-info-grid">
                    {infoItems.map((item, i) => (
                        <div key={i} className="profile-info-item">
                            <div className="profile-info-icon">{item.icon}</div>
                            <div>
                                <span className="profile-info-label">{item.label}</span>
                                <span className="profile-info-value">{item.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
