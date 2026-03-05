/* ═══════════════════════════════════════════════════
   Forgot Password Page — Send verification code via email
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    HiOutlineEnvelope,
    HiOutlineLockClosed,
    HiOutlineArrowLeft,
    HiOutlineKey,
    HiOutlineCheckCircle,
    HiOutlineEye,
    HiOutlineEyeSlash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import logoImg from '../../assets/logo sentiment.png';
import api from '../../services/api';
import './AuthPages.css';

type Step = 'email' | 'verify' | 'reset' | 'done';

const COOLDOWN_SECONDS = 10;

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Cooldown state for resend
    const [cooldown, setCooldown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startCooldown = () => {
        setCooldown(COOLDOWN_SECONDS);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Step 1: Send verification code to email
    const handleSendCode = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!email.trim()) {
            toast.error('Vui lòng nhập email.');
            return;
        }
        if (cooldown > 0) return;

        setLoading(true);
        try {
            await api.post('/api/v1/auth/forgot-password', { email: email.trim() });
            toast.success('Mã xác thực đã được gửi đến email của bạn!');
            if (step === 'email') setStep('verify');
            startCooldown();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify code
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            toast.error('Vui lòng nhập mã xác thực.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/v1/auth/verify-reset-code', { email: email.trim(), code: code.trim() });
            toast.success('Xác thực thành công!');
            setStep('reset');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Mã xác thực không đúng.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error('Mật khẩu mới tối thiểu 6 ký tự.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/v1/auth/reset-password', {
                email: email.trim(),
                code: code.trim(),
                new_password: newPassword,
            });
            toast.success('Đặt lại mật khẩu thành công!');
            setStep('done');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Không thể đặt lại mật khẩu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-glow" />

            <button className="auth-back-btn btn btn-ghost" onClick={() => navigate('/login')}>
                <HiOutlineArrowLeft /> Đăng nhập
            </button>

            <div className="auth-container animate-scale-in">
                <div className="auth-card glass-card-static">
                    <div className="auth-header">
                        <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none', width: '64px', height: '64px' }}>
                            <img src={logoImg} alt="SentimentAI Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <h1>
                            {step === 'done' ? 'Hoàn tất!' : 'Quên mật khẩu'}
                        </h1>
                        <p>
                            {step === 'email' && 'Nhập email đã đăng ký để nhận mã xác thực.'}
                            {step === 'verify' && `Mã xác thực đã gửi đến ${email}. Vui lòng kiểm tra email.`}
                            {step === 'reset' && 'Nhập mật khẩu mới cho tài khoản của bạn.'}
                            {step === 'done' && 'Mật khẩu đã được đặt lại. Bạn có thể đăng nhập ngay.'}
                        </p>
                    </div>

                    {/* Step 1: Email */}
                    {step === 'email' && (
                        <form className="auth-form" onSubmit={handleSendCode}>
                            <div className="input-group">
                                <label htmlFor="forgot-email">Email</label>
                                <div className="auth-input-wrapper">
                                    <HiOutlineEnvelope className="auth-input-icon" />
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        className="input auth-input-with-icon"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading || cooldown > 0}>
                                {loading ? (
                                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                                ) : cooldown > 0 ? (
                                    `Gửi lại sau ${cooldown}s`
                                ) : (
                                    'Gửi mã xác thực'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Verify Code */}
                    {step === 'verify' && (
                        <form className="auth-form" onSubmit={handleVerifyCode}>
                            <div className="input-group">
                                <label htmlFor="verify-code">Mã xác thực (6 số)</label>
                                <div className="auth-input-wrapper">
                                    <HiOutlineKey className="auth-input-icon" />
                                    <input
                                        id="verify-code"
                                        type="text"
                                        className="input auth-input-with-icon"
                                        placeholder="Nhập mã 6 số"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                        autoFocus
                                        maxLength={6}
                                        style={{ letterSpacing: '0.5em', fontWeight: 700, fontSize: '1.2rem' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading || code.length < 6}>
                                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Xác nhận'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost auth-submit"
                                onClick={() => handleSendCode()}
                                disabled={loading || cooldown > 0}
                            >
                                {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}
                            </button>
                        </form>
                    )}

                    {/* Step 3: New Password */}
                    {step === 'reset' && (
                        <form className="auth-form" onSubmit={handleResetPassword}>
                            <div className="input-group">
                                <label htmlFor="new-password">Mật khẩu mới</label>
                                <div className="auth-input-wrapper">
                                    <HiOutlineLockClosed className="auth-input-icon" />
                                    <input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input auth-input-with-icon"
                                        placeholder="Tối thiểu 6 ký tự"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        autoFocus
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
                            <div className="input-group">
                                <label htmlFor="confirm-new-password">Xác nhận mật khẩu mới</label>
                                <div className="auth-input-wrapper">
                                    <HiOutlineLockClosed className="auth-input-icon" />
                                    <input
                                        id="confirm-new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input auth-input-with-icon"
                                        placeholder="Nhập lại mật khẩu"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                                {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Đặt lại mật khẩu'}
                            </button>
                        </form>
                    )}

                    {/* Step 4: Done */}
                    {step === 'done' && (
                        <div className="auth-form" style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: 'var(--space-4)', color: 'var(--success, #22c55e)' }}>
                                <HiOutlineCheckCircle size={72} />
                            </div>
                            <button className="btn btn-primary btn-lg auth-submit" onClick={() => navigate('/login')}>
                                Đăng nhập ngay
                            </button>
                        </div>
                    )}

                    <div className="auth-footer">
                        <p>
                            Nhớ mật khẩu?{' '}
                            <Link to="/login">Đăng nhập</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
