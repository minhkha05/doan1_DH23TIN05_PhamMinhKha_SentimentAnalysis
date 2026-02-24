/* ═══════════════════════════════════════════════════
   Register Page
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineEnvelope, HiOutlineLockClosed, HiOutlinePhone, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import './AuthPages.css';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', sdt: '', matkhau: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email && !formData.sdt) {
            toast.error('Phải cung cấp email hoặc số điện thoại.');
            return;
        }
        if (formData.matkhau.length < 6) {
            toast.error('Mật khẩu tối thiểu 6 ký tự.');
            return;
        }
        if (formData.matkhau !== formData.confirm) {
            toast.error('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        try {
            await authService.register({
                email: formData.email || undefined,
                sdt: formData.sdt || undefined,
                matkhau: formData.matkhau,
            });
            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Đăng ký thất bại.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-glow" />
            <div className="auth-container animate-scale-in">
                <div className="auth-card glass-card-static">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <HiOutlineSparkles size={24} />
                        </div>
                        <h1>Tạo tài khoản</h1>
                        <p>Đăng ký miễn phí để bắt đầu phân tích cảm xúc.</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="reg-email">Email</label>
                            <div className="auth-input-wrapper">
                                <HiOutlineEnvelope className="auth-input-icon" />
                                <input
                                    id="reg-email"
                                    type="email"
                                    className="input auth-input-with-icon"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="reg-sdt">Số điện thoại <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(không bắt buộc)</span></label>
                            <div className="auth-input-wrapper">
                                <HiOutlinePhone className="auth-input-icon" />
                                <input
                                    id="reg-sdt"
                                    type="tel"
                                    className="input auth-input-with-icon"
                                    placeholder="0362396144"
                                    value={formData.sdt}
                                    onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="reg-password">Mật khẩu</label>
                            <div className="auth-input-wrapper">
                                <HiOutlineLockClosed className="auth-input-icon" />
                                <input
                                    id="reg-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input auth-input-with-icon"
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={formData.matkhau}
                                    onChange={(e) => setFormData({ ...formData, matkhau: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="reg-confirm">Xác nhận mật khẩu</label>
                            <div className="auth-input-wrapper">
                                <HiOutlineLockClosed className="auth-input-icon" />
                                <input
                                    id="reg-confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input auth-input-with-icon"
                                    placeholder="Nhập lại mật khẩu"
                                    value={formData.confirm}
                                    onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Đăng ký'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Đã có tài khoản?{' '}
                            <Link to="/login">Đăng nhập</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
