/* ═══════════════════════════════════════════════════
   Landing Page – hero, features, CTA
   ═══════════════════════════════════════════════════ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineSparkles,
    HiOutlineBolt,
    HiOutlineShieldCheck,
    HiOutlineChartBar,
    HiOutlineArrowRight,
    HiOutlineSun,
    HiOutlineMoon,
} from 'react-icons/hi2';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const { isAuthenticated } = useAuth();

    const features = [
        {
            icon: <HiOutlineSparkles />,
            title: 'AI Phân tích cảm xúc',
            desc: 'Sử dụng mô hình PhoBERT tiên tiến để phân tích cảm xúc văn bản tiếng Việt với độ chính xác cao.',
        },
        {
            icon: <HiOutlineBolt />,
            title: 'Xử lý siêu nhanh',
            desc: 'Kết quả phân tích được trả về trong vài giây, hỗ trợ xử lý hàng loạt văn bản cùng lúc.',
        },
        {
            icon: <HiOutlineShieldCheck />,
            title: 'Bảo mật cao',
            desc: 'Xác thực JWT, mã hóa bcrypt, phân quyền RBAC đảm bảo dữ liệu luôn an toàn.',
        },
        {
            icon: <HiOutlineChartBar />,
            title: 'Dashboard thông minh',
            desc: 'Thống kê trực quan, biểu đồ xu hướng, quản lý nhãn và xuất dữ liệu dễ dàng.',
        },
    ];

    return (
        <div className="landing">
            {/* Nav */}
            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-brand">
                        <div className="landing-brand-icon">
                            <HiOutlineSparkles size={18} />
                        </div>
                        <span className="landing-brand-text">SentimentAI</span>
                    </div>
                    <div className="landing-nav-actions">
                        <button className="btn btn-icon btn-ghost" onClick={toggleTheme}>
                            {isDark ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
                        </button>
                        {isAuthenticated ? (
                            <button className="btn btn-primary" onClick={() => navigate('/home')}>
                                Truy cập App
                            </button>
                        ) : (
                            <>
                                <button className="btn btn-ghost" onClick={() => navigate('/login')}>
                                    Đăng nhập
                                </button>
                                <button className="btn btn-primary" onClick={() => navigate('/register')}>
                                    Bắt đầu miễn phí <HiOutlineArrowRight />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-glow" />
                <div className="landing-hero-content animate-fade-in-up">
                    <div className="landing-hero-badge">
                        <HiOutlineSparkles /> Powered by PhoBERT AI
                    </div>
                    <h1 className="landing-hero-title">
                        Phân tích <span className="text-gradient">Cảm xúc</span> Văn bản
                        <br />Tiếng Việt bằng AI
                    </h1>
                    <p className="landing-hero-desc">
                        Hệ thống phân tích cảm xúc tiên tiến sử dụng mô hình AI PhoBERT,
                        được tối ưu hóa cho tiếng Việt. Phát hiện Tích cực, Tiêu cực và Trung tính
                        với độ chính xác cao.
                    </p>
                    <div className="landing-hero-actions">
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => navigate(isAuthenticated ? '/home' : '/register')}
                        >
                            <HiOutlineSparkles />
                            Thử ngay miễn phí
                        </button>
                        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
                            Xem Demo
                        </button>
                    </div>
                    <div className="landing-hero-stats">
                        <div className="landing-stat">
                            <span className="landing-stat-value">95%+</span>
                            <span className="landing-stat-label">Độ chính xác</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value">&lt;2s</span>
                            <span className="landing-stat-label">Thời gian phản hồi</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value">3</span>
                            <span className="landing-stat-label">Nhãn cảm xúc</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="landing-features">
                <div className="landing-section-header animate-fade-in-up">
                    <h2>Tại sao chọn SentimentAI?</h2>
                    <p>Nền tảng phân tích cảm xúc toàn diện, được thiết kế dành riêng cho tiếng Việt</p>
                </div>
                <div className="landing-features-grid">
                    {features.map((f, i) => (
                        <div key={i} className={`landing-feature-card glass-card animate-fade-in-up stagger-${i + 1}`}>
                            <div className="landing-feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="landing-cta animate-fade-in-up">
                <div className="landing-cta-card glass-card-static">
                    <h2>Sẵn sàng bắt đầu?</h2>
                    <p>Tạo tài khoản miễn phí và trải nghiệm sức mạnh AI ngay hôm nay.</p>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                        Đăng ký ngay <HiOutlineArrowRight />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>&copy; 2026 SentimentAI. Đồ án 1 — Phạm Minh Kha — DH23TIN05.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
