/* ═══════════════════════════════════════════════════
   Login Page
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineArrowLeft } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
import { getApiBaseUrl } from '../../services/api';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import logoImg from '../../assets/logo sentiment.png';
import './AuthPages.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', matkhau: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem('sentiment_remember_email');
        const savedPw = localStorage.getItem('sentiment_remember_matkhau');
        if (savedEmail && savedPw) {
            setFormData({ email: savedEmail, matkhau: atob(savedPw) });
            setRememberMe(true);
        }
    }, []);

    const handleGoogleLogin = () => {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) {
            toast.error('Thiếu cấu hình API. Vui lòng kiểm tra VITE_API_BASE_URL trên server.');
            return;
        }
        const base = apiBaseUrl.replace(/\/$/, '');
        window.location.href = `${base}/api/v1/auth/google/login`;
    };

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
            if (rememberMe) {
                localStorage.setItem('sentiment_remember_email', formData.email);
                localStorage.setItem('sentiment_remember_matkhau', btoa(formData.matkhau));
            } else {
                localStorage.removeItem('sentiment_remember_email');
                localStorage.removeItem('sentiment_remember_matkhau');
            }
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

            {/* Back to Landing */}
            <button className="auth-back-btn btn btn-ghost" onClick={() => navigate('/')}>
                <HiOutlineArrowLeft /> Trang chủ
            </button>

            <div className="auth-container animate-scale-in">
                <div className="auth-card glass-card-static">
                    <div className="auth-header">
                        <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none', width: '64px', height: '64px' }}>
                            <img src={logoImg} alt="SentimentAI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-options">
                            <label className="auth-remember-checkbox">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Ghi nhớ mật khẩu
                            </label>
                            <div className="auth-forgot-link">
                                <Link to="/forgot-password">Quên mật khẩu?</Link>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Đăng nhập'}
                        </button>

                        <div className="auth-divider">
                            <span>hoặc</span>
                        </div>

                        <button type="button" className="btn btn-outline btn-lg auth-google-btn" onClick={handleGoogleLogin}>
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Đăng nhập bằng Google
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
