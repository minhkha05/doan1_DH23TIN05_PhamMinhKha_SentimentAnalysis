/* ═══════════════════════════════════════════════════
   Free Trial Page — 5 free analyses without login
   Data is NOT saved to database.
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineSparkles,
    HiOutlinePaperAirplane,
    HiOutlineFaceSmile,
    HiOutlineFaceFrown,
    HiOutlineMinusCircle,
    HiOutlineArrowPath,
    HiOutlineArrowLeft,
    HiOutlineArrowUpTray,
} from 'react-icons/hi2';
import api from '../../services/api';
import type { BatchAnalyzeItem } from '../../types';
import toast from 'react-hot-toast';
import './FreeTrialPage.css';

type CamXuc = 'positive' | 'negative' | 'neutral';

interface FreeResult {
    camxuc: CamXuc;
    tincay: number;
    noidung: string;
    model: string;
}

const sentimentConfig: Record<CamXuc, { icon: React.ReactNode; label: string; className: string; emoji: string }> = {
    positive: { icon: <HiOutlineFaceSmile />, label: 'Tích cực', className: 'positive', emoji: '😊' },
    negative: { icon: <HiOutlineFaceFrown />, label: 'Tiêu cực', className: 'negative', emoji: '😞' },
    neutral: { icon: <HiOutlineMinusCircle />, label: 'Trung tính', className: 'neutral', emoji: '😐' },
};

const MAX_FREE = 5;
const STORAGE_KEY = 'sentimentai_free_count';

const FreeTrialPage: React.FC = () => {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<FreeResult | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [batchResults, setBatchResults] = useState<BatchAnalyzeItem[]>([]);
    const [usedCount, setUsedCount] = useState(0);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Reset daily
            const today = new Date().toDateString();
            if (data.date !== today) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 0, date: today }));
                setUsedCount(0);
            } else {
                setUsedCount(data.count);
            }
        }
    }, []);

    const handleAnalyze = async () => {
        if (!text.trim()) {
            toast.error('Vui lòng nhập văn bản cần phân tích.');
            return;
        }
        if (usedCount >= MAX_FREE) {
            toast.error('Bạn đã hết lượt dùng thử miễn phí. Vui lòng đăng ký để tiếp tục.');
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            // Call a public analyze endpoint that doesn't save to DB
            const res = await api.post('/api/v1/user/analyze-free', { noidung: text.trim() });
            setResult(res.data);
            toast.success('Phân tích hoàn tất!');

            // Update count
            const newCount = usedCount + 1;
            setUsedCount(newCount);
            const today = new Date().toDateString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) {
            setSelectedFile(null);
            return;
        }

        const lowerName = file.name.toLowerCase();
        const validExt = lowerName.endsWith('.txt') || lowerName.endsWith('.csv') || lowerName.endsWith('.tsv');
        if (!validExt) {
            toast.error('Chỉ hỗ trợ file .txt, .csv, .tsv');
            event.target.value = '';
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    };

    const handleAnalyzeFile = async () => {
        if (!selectedFile) {
            toast.error('Vui lòng chọn file trước khi phân tích.');
            return;
        }
        if (usedCount >= MAX_FREE) {
            toast.error('Bạn đã hết lượt dùng thử miễn phí. Vui lòng đăng ký để tiếp tục.');
            return;
        }

        setUploading(true);
        setBatchResults([]);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const res = await api.post('/api/v1/user/analyze-free-batch', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setBatchResults(res.data.items || []);
            toast.success(`Đã phân tích ${res.data.success_count}/${res.data.total_rows} dòng.`);

            const newCount = usedCount + 1;
            setUsedCount(newCount);
            const today = new Date().toDateString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, date: today }));
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Không thể phân tích file.');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setText('');
        setResult(null);
        setBatchResults([]);
        setSelectedFile(null);
    };

    const remaining = MAX_FREE - usedCount;
    const config = result ? sentimentConfig[result.camxuc] : null;

    return (
        <div className="free-trial-page">
            {/* Back */}
            <button className="auth-back-btn btn btn-ghost" onClick={() => navigate('/')}>
                <HiOutlineArrowLeft /> Trang chủ
            </button>

            <div className="free-trial-container animate-fade-in-up">
                <div className="free-trial-header">
                    <h1>
                        <HiOutlineSparkles className="free-trial-icon" />
                        Thử miễn phí
                    </h1>
                    <p>Phân tích cảm xúc văn bản tiếng Việt không cần đăng nhập</p>
                    <div className={`free-trial-counter ${remaining <= 1 ? 'warning' : ''}`}>
                        Còn lại: <strong>{remaining}</strong> / {MAX_FREE} lượt
                    </div>
                </div>

                <div className="free-trial-workspace">
                    <div className="free-trial-input glass-card-static">
                        <div className="free-trial-input-header">
                            <h2>Nhập văn bản</h2>
                            <span className="free-trial-char-count">{text.length} / 5,000</span>
                        </div>
                        <textarea
                            className="input textarea free-trial-textarea"
                            placeholder="Nhập hoặc dán văn bản tiếng Việt tại đây..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={5000}
                            disabled={loading || remaining <= 0}
                        />
                        <div className="free-trial-actions">
                            <button className="btn btn-ghost" onClick={handleReset} disabled={loading}>
                                <HiOutlineArrowPath /> Làm mới
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleAnalyze}
                                disabled={loading || !text.trim() || remaining <= 0}
                            >
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

                        <div className="free-trial-upload">
                            <div className="free-trial-upload-title">
                                <HiOutlineArrowUpTray /> Upload file phân tích hàng loạt
                            </div>
                            <p>
                                Người dùng tự do vẫn có thể upload file để phân tích.
                                Mỗi lần upload tính 1 lượt, tối đa {MAX_FREE} lượt/ngày.
                            </p>
                            <div className="free-trial-upload-controls">
                                <input
                                    type="file"
                                    accept=".txt,.csv,.tsv"
                                    onChange={handleFileChange}
                                    disabled={uploading || remaining <= 0}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAnalyzeFile}
                                    disabled={uploading || !selectedFile || remaining <= 0}
                                >
                                    {uploading ? (
                                        <>
                                            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                            Đang xử lý file...
                                        </>
                                    ) : (
                                        <>
                                            <HiOutlineArrowUpTray />
                                            Upload và phân tích
                                        </>
                                    )}
                                </button>
                            </div>
                            {selectedFile && (
                                <div className="free-trial-upload-file">File đã chọn: <strong>{selectedFile.name}</strong></div>
                            )}
                            <div className="free-trial-upload-filebox">
                                Hỗ trợ .txt, .csv, .tsv (tối đa 200 dòng)
                            </div>

                            {batchResults.length > 0 && (
                                <div className="free-trial-batch-results">
                                    <h3>Kết quả file ({batchResults.length} dòng)</h3>
                                    <div className="free-trial-batch-table-wrapper">
                                        <table className="table free-trial-batch-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Nội dung</th>
                                                    <th>Cảm xúc</th>
                                                    <th>Tin cậy</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {batchResults.map((item) => (
                                                    <tr key={`${item.index}-${item.noidung}`}>
                                                        <td>{item.index}</td>
                                                        <td className="free-trial-batch-cell-text">{item.noidung}</td>
                                                        <td>
                                                            {item.camxuc ? (
                                                                <span className={`badge badge-${sentimentConfig[item.camxuc].class}`}>
                                                                    {sentimentConfig[item.camxuc].label}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="free-trial-batch-confidence">
                                                            {item.tincay != null ? `${(item.tincay * 100).toFixed(1)}%` : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result */}
                    {result && config && (
                        <div className="free-trial-result animate-scale-in">
                            <div className={`free-trial-result-card glass-card-static free-trial-result-${config.className}`}>
                                <div className="free-trial-result-emoji">{config.emoji}</div>
                                <div className="free-trial-result-header">
                                    <div className={`badge badge-${config.className}`}>
                                        {config.icon} {config.label}
                                    </div>
                                </div>

                                <div className="free-trial-confidence">
                                    <div className="free-trial-confidence-header">
                                        <span>Độ tin cậy</span>
                                        <span className="free-trial-confidence-value">
                                            {((result.tincay || 0) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="free-trial-confidence-bar">
                                        <div
                                            className={`free-trial-confidence-fill free-trial-confidence-${config.className}`}
                                            style={{ width: `${(result.tincay || 0) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="free-trial-notice">
                                    ⚠️ Kết quả dùng thử không được lưu vào hệ thống.{' '}
                                    <a onClick={() => navigate('/register')} style={{ cursor: 'pointer', color: 'var(--primary-500)', fontWeight: 600 }}>
                                        Đăng ký
                                    </a>{' '}
                                    để lưu lịch sử phân tích.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Out of tries */}
                    {remaining <= 0 && !result && (
                        <div className="free-trial-limit glass-card-static animate-scale-in">
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🔒</div>
                            <h3>Đã hết lượt dùng thử</h3>
                            <p>Đăng ký tài khoản miễn phí để phân tích không giới hạn và lưu lịch sử.</p>
                            <div className="free-trial-limit-actions">
                                <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                                    Đăng ký miễn phí
                                </button>
                                <button className="btn btn-ghost" onClick={() => navigate('/login')}>
                                    Đã có tài khoản? Đăng nhập
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FreeTrialPage;
