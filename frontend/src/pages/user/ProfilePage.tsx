/* ═══════════════════════════════════════════════════
   Profile Page – with phone edit & password change
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlinePhone,
    HiOutlineShieldCheck,
    HiOutlineCalendar,
    HiOutlineFingerPrint,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineEyeSlash,
    HiOutlinePencilSquare,
    HiOutlineCheck,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
    const { user, refreshProfile } = useAuth();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Phone edit state
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    if (!user) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;

    const infoItems = [
        { icon: <HiOutlineFingerPrint />, label: 'ID', value: `#${user.tk_id}` },
        { icon: <HiOutlineEnvelope />, label: 'Email', value: user.tk_email || 'Không có' },
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu mới và xác nhận không khớp.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        setChangingPassword(true);
        try {
            await userService.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success('Đổi mật khẩu thành công!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi khi đổi mật khẩu.');
        } finally {
            setChangingPassword(false);
        }
    };

    const startEditPhone = () => {
        setPhoneValue(user.tk_sdt || '');
        setEditingPhone(true);
    };

    const cancelEditPhone = () => {
        setEditingPhone(false);
        setPhoneValue('');
    };

    const handleSavePhone = async () => {
        if (!phoneValue.trim() || phoneValue.trim().length < 9) {
            toast.error('Số điện thoại phải có ít nhất 9 ký tự.');
            return;
        }
        setSavingPhone(true);
        try {
            await userService.updatePhone(phoneValue.trim());
            toast.success('Cập nhật số điện thoại thành công!');
            setEditingPhone(false);
            await refreshProfile();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Lỗi khi cập nhật số điện thoại.');
        } finally {
            setSavingPhone(false);
        }
    };

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

                    {/* Phone – editable */}
                    <div className="profile-info-item">
                        <div className="profile-info-icon"><HiOutlinePhone /></div>
                        <div style={{ flex: 1 }}>
                            <span className="profile-info-label">Số điện thoại</span>
                            {editingPhone ? (
                                <div className="profile-phone-edit">
                                    <input
                                        type="tel"
                                        className="input profile-phone-input"
                                        value={phoneValue}
                                        onChange={(e) => setPhoneValue(e.target.value)}
                                        placeholder="Nhập số điện thoại"
                                        autoFocus
                                    />
                                    <button
                                        className="btn btn-sm btn-primary profile-phone-save-btn"
                                        onClick={handleSavePhone}
                                        disabled={savingPhone}
                                        title="Lưu"
                                    >
                                        {savingPhone ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <HiOutlineCheck size={14} />}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-ghost"
                                        onClick={cancelEditPhone}
                                        title="Hủy"
                                    >
                                        <HiOutlineXMark size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="profile-phone-display">
                                    <span className="profile-info-value">{user.tk_sdt || 'Không có'}</span>
                                    <button
                                        className="btn btn-ghost btn-sm profile-edit-phone-btn"
                                        onClick={startEditPhone}
                                        title="Chỉnh sửa số điện thoại"
                                    >
                                        <HiOutlinePencilSquare size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Change Password Section ──────────────── */}
            <div className="profile-card glass-card-static animate-fade-in-up stagger-2" style={{ marginTop: 'var(--space-6)' }}>
                <h3 className="profile-section-title">
                    <HiOutlineLockClosed /> Đổi mật khẩu
                </h3>

                <form className="profile-password-form" onSubmit={handleChangePassword}>
                    <div className="profile-password-field">
                        <label className="profile-info-label">Mật khẩu hiện tại</label>
                        <div className="profile-password-input-wrapper">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                className="input"
                                placeholder="Nhập mật khẩu hiện tại"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="profile-eye-btn" onClick={() => setShowCurrent(!showCurrent)}>
                                {showCurrent ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                            </button>
                        </div>
                    </div>

                    <div className="profile-password-field">
                        <label className="profile-info-label">Mật khẩu mới</label>
                        <div className="profile-password-input-wrapper">
                            <input
                                type={showNew ? 'text' : 'password'}
                                className="input"
                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button type="button" className="profile-eye-btn" onClick={() => setShowNew(!showNew)}>
                                {showNew ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                            </button>
                        </div>
                    </div>

                    <div className="profile-password-field">
                        <label className="profile-info-label">Xác nhận mật khẩu mới</label>
                        <div className="profile-password-input-wrapper">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                className="input"
                                placeholder="Nhập lại mật khẩu mới"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button type="button" className="profile-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                        >
                            {changingPassword ? <span className="spinner" /> : 'Đổi mật khẩu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
