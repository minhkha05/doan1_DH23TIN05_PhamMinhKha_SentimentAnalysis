/* ═══════════════════════════════════════════════════
   Home Page – AI text analysis workspace
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
    HiOutlineSparkles,
    HiOutlinePaperAirplane,
    HiOutlineFaceSmile,
    HiOutlineFaceFrown,
    HiOutlineMinusCircle,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import { userService } from '../../services/userService';
import type { KetQuaResponse, CamXuc } from '../../types';
import toast from 'react-hot-toast';
import './HomePage.css';

const sentimentConfig: Record<CamXuc, { icon: React.ReactNode; label: string; class: string; emoji: string }> = {
    positive: { icon: <HiOutlineFaceSmile />, label: 'Tích cực', class: 'positive', emoji: '😊' },
    negative: { icon: <HiOutlineFaceFrown />, label: 'Tiêu cực', class: 'negative', emoji: '😞' },
    neutral: { icon: <HiOutlineMinusCircle />, label: 'Trung tính', class: 'neutral', emoji: '😐' },
};

const HomePage: React.FC = () => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<KetQuaResponse | null>(null);

    const handleAnalyze = async () => {
        if (!text.trim()) {
            toast.error('Vui lòng nhập văn bản cần phân tích.');
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await userService.analyzeText({ noidung: text.trim() });
            setResult(res.data);
            toast.success('Phân tích hoàn tất!');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setText('');
        setResult(null);
    };

    const config = result ? sentimentConfig[result.camxuc] : null;

    return (
        <div className="home-page">
            <div className="home-header animate-fade-in-down">
                <h1>
                    <HiOutlineSparkles className="home-header-icon" />
                    Phân tích cảm xúc
                </h1>
                <p>Nhập văn bản tiếng Việt và AI sẽ phân tích cảm xúc cho bạn</p>
            </div>

            <div className="home-workspace">
                {/* Input Section */}
                <div className="home-input-section glass-card-static animate-fade-in-up stagger-1">
                    <div className="home-input-header">
                        <h2>Nhập văn bản</h2>
                        <span className="home-char-count">{text.length} / 10,000</span>
                    </div>
                    <textarea
                        className="input textarea home-textarea"
                        placeholder="Nhập hoặc dán văn bản tiếng Việt tại đây. Ví dụ: Sản phẩm rất tốt, giao hàng nhanh, tôi rất hài lòng..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={10000}
                        disabled={loading}
                    />
                    <div className="home-input-actions">
                        <button className="btn btn-ghost" onClick={handleReset} disabled={loading}>
                            <HiOutlineArrowPath /> Làm mới
                        </button>
                        <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={loading || !text.trim()}>
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                    Đang phân tích...
                                </>
                            ) : (
                                <>
                                    <HiOutlinePaperAirplane />
                                    Phân tích
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Result Section */}
                {result && config && (
                    <div className="home-result animate-scale-in">
                        <div className={`home-result-card glass-card-static home-result-${config.class}`}>
                            <div className="home-result-emoji">{config.emoji}</div>
                            <div className="home-result-header">
                                <div className={`badge badge-${config.class}`}>
                                    {config.icon} {config.label}
                                </div>
                                <span className="home-result-model">Model: {result.model}</span>
                            </div>

                            <div className="home-result-confidence">
                                <div className="home-confidence-header">
                                    <span>Độ tin cậy</span>
                                    <span className="home-confidence-value">
                                        {((result.tincay || 0) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="home-confidence-bar">
                                    <div
                                        className={`home-confidence-fill home-confidence-${config.class}`}
                                        style={{ width: `${(result.tincay || 0) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="home-result-text">
                                <h4>Văn bản đã phân tích</h4>
                                <p>{result.noidung}</p>
                            </div>

                            <div className="home-result-meta">
                                <span>ID: #{result.kq_id}</span>
                                <span>VB: #{result.vb_id}</span>
                                {result.luclay && (
                                    <span>{new Date(result.luclay).toLocaleString('vi-VN')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
