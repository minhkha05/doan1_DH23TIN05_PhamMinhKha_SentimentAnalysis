/* ═══════════════════════════════════════════════════
   Admin Test Model Page – quick analysis test
   ═══════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
    HiOutlineBeaker,
    HiOutlinePaperAirplane,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import { userService } from '../../services/userService';
import type { KetQuaResponse, CamXuc } from '../../types';
import toast from 'react-hot-toast';
import './AdminPages.css';

const sentimentMap: Record<CamXuc, { label: string; class: string; emoji: string }> = {
    positive: { label: 'Tích cực', class: 'positive', emoji: '😊' },
    negative: { label: 'Tiêu cực', class: 'negative', emoji: '😞' },
    neutral: { label: 'Trung tính', class: 'neutral', emoji: '😐' },
};

const sampleTexts = [
    'Sản phẩm rất tốt, giao hàng nhanh, đóng gói cẩn thận. Tôi rất hài lòng!',
    'Hàng kém chất lượng, giao chậm, nhân viên hỗ trợ thiếu nhiệt tình.',
    'Sản phẩm bình thường, không có gì đặc biệt, giá cả hợp lý.',
    'Tuyệt vời! Chất lượng xuất sắc, đáng mua, sẽ quay lại mua thêm.',
    'Thất vọng hoàn toàn, sản phẩm không như mô tả, lừa đảo.',
];

const TestModelPage: React.FC = () => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<KetQuaResponse[]>([]);

    const handleTest = async () => {
        if (!text.trim()) {
            toast.error('Vui lòng nhập văn bản.');
            return;
        }
        setLoading(true);
        try {
            const res = await userService.analyzeText({ noidung: text.trim() });
            setResults((prev) => [res.data, ...prev]);
            setText('');
            toast.success('Test hoàn tất!');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    const handleSample = (sample: string) => {
        setText(sample);
    };

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineBeaker /> Test Model</h1>
                <p>Kiểm tra nhanh mô hình phân tích cảm xúc</p>
            </div>

            <div className="test-input-card glass-card-static animate-fade-in-up stagger-1">
                <textarea
                    className="input textarea"
                    placeholder="Nhập văn bản để test..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                />
                <div className="test-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setText(''); setResults([]); }}>
                        <HiOutlineArrowPath /> Reset
                    </button>
                    <button className="btn btn-primary" onClick={handleTest} disabled={loading || !text.trim()}>
                        {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <HiOutlinePaperAirplane />}
                        Test
                    </button>
                </div>

                <div className="test-samples">
                    <span className="test-samples-label">Mẫu thử:</span>
                    <div className="test-samples-list">
                        {sampleTexts.map((s, i) => (
                            <button key={i} className="btn btn-ghost btn-sm test-sample-btn" onClick={() => handleSample(s)}>
                                {s.slice(0, 40)}...
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {results.length > 0 && (
                <div className="test-results animate-fade-in-up stagger-2">
                    <h3>Kết quả ({results.length})</h3>
                    <div className="test-results-list">
                        {results.map((r, i) => {
                            const config = sentimentMap[r.camxuc];
                            return (
                                <div key={i} className="test-result-item glass-card animate-fade-in-up">
                                    <div className="test-result-top">
                                        <span className="test-result-emoji">{config.emoji}</span>
                                        <span className={`badge badge-${config.class}`}>{config.label}</span>
                                        <span className="test-result-confidence">{((r.tincay || 0) * 100).toFixed(1)}%</span>
                                        <span className="test-result-model">{r.model}</span>
                                    </div>
                                    <p className="test-result-text">{r.noidung}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestModelPage;
