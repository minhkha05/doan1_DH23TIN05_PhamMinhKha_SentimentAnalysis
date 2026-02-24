/* ═══════════════════════════════════════════════════
   Login Page
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineArrowLeft } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';
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
