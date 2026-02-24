/* ═══════════════════════════════════════════════════
   Login Page
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineSparkles, HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import './AuthPages.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', matkhau: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.matkhau) {
            toast.error('Vui lòng nhập đầy đủ thông tin.');
            return;
        }
        setLoading(true);
        try {
            const result = await authService.login({
                email: formData.email,
                matkhau: formData.matkhau,
            });
            login(result);
            toast.success('Đăng nhập thành công!');
            navigate(result.vaitro === 'admin' ? '/admin/dashboard' : '/home');
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Đăng nhập thất bại.';
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
                        <h1>Đăng nhập</h1>
                        <p>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <div className="auth-input-wrapper">
                                <HiOutlineEnvelope className="auth-input-icon" />
                                <input
                                    id="email"
                                    type="email"
                                    className="input auth-input-with-icon"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Mật khẩu</label>
                            <div className="auth-input-wrapper">
                                <HiOutlineLockClosed className="auth-input-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input auth-input-with-icon"
                                    placeholder="••••••••"
                                    value={formData.matkhau}
                                    onChange={(e) => setFormData({ ...formData, matkhau: e.target.value })}
                                    autoComplete="current-password"
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

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Đăng nhập'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Chưa có tài khoản?{' '}
                            <Link to="/register">Đăng ký ngay</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
