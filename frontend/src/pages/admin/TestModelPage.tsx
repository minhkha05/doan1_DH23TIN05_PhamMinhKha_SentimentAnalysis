import React, { useState, useEffect } from 'react';
import {
    HiOutlineBeaker,
    HiOutlinePaperAirplane,
    HiOutlineArrowPath,
    HiOutlineCpuChip,
    HiOutlineCheckCircle,
    HiOutlineStar,
    HiOutlineInformationCircle,
    HiOutlineChartBar,
} from 'react-icons/hi2';
import { adminService, type ModelInfo } from '../../services/adminService';
import type { CamXuc } from '../../types';
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

interface TestResult {
    camxuc: CamXuc;
    tincay: number;
    noidung: string;
    model: string;
}

const TestModelPage: React.FC = () => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);

    const [models, setModels] = useState<ModelInfo[]>([]);
    const [activeModel, setActiveModel] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loadingModels, setLoadingModels] = useState(true);
    const [settingActive, setSettingActive] = useState(false);

    const [showConfirm, setShowConfirm] = useState(false);
    const [showDetails, setShowDetails] = useState(true);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const res = await adminService.getModels();
            setModels(res.models);
            setActiveModel(res.active_model);
            if (res.models.length > 0) {
                setSelectedModel(res.active_model || res.models[0].name);
            }
        } catch {
            toast.error('Không thể tải danh sách mô hình.');
        } finally {
            setLoadingModels(false);
        }
    };

    const handleTest = async () => {
        if (!text.trim()) {
            toast.error('Vui lòng nhập văn bản.');
            return;
        }
        if (!selectedModel) {
            toast.error('Vui lòng chọn mô hình.');
            return;
        }
        setLoading(true);
        try {
            const res = await adminService.testModel(text.trim(), selectedModel);
            setResults((prev) => [res, ...prev]);
            setText('');
            toast.success('Test hoàn tất!');
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(message || 'Có lỗi xảy ra khi test model.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetActive = async () => {
        setSettingActive(true);
        try {
            await adminService.setActiveModel(selectedModel);
            setActiveModel(selectedModel);
            setShowConfirm(false);
            toast.success(`Đã đặt "${selectedModel}" làm mô hình mặc định!`);
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            toast.error(message || 'Không thể cập nhật mô hình mặc định.');
        } finally {
            setSettingActive(false);
        }
    };

    const currentModelInfo = models.find((m) => m.name === selectedModel);

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineBeaker /> Test Model</h1>
                <p>Chọn mô hình AI, kiểm tra hiệu quả và đặt mô hình mặc định cho hệ thống</p>
            </div>

            <div className="model-selector glass-card-static animate-fade-in-up stagger-1">
                <div className="model-selector-header">
                    <HiOutlineCpuChip size={20} />
                    <h3>Chọn mô hình AI</h3>
                </div>

                {loadingModels ? (
                    <div className="model-selector-loading"><div className="spinner" /></div>
                ) : models.length === 0 ? (
                    <div className="model-selector-empty">
                        <p>Chưa có mô hình nào trong thư mục <code>/models</code>.</p>
                        <p>Hãy fine-tune PhoBERT và đặt model vào thư mục models.</p>
                    </div>
                ) : (
                    <>
                        <div className="model-selector-row">
                            <select
                                className="input model-dropdown"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                            >
                                {models.map((m) => (
                                    <option key={m.name} value={m.name} className="model-dropdown-option">
                                        {m.name}{m.name === activeModel ? ' ⭐ (mặc định)' : ''}
                                    </option>
                                ))}
                            </select>

                            <button
                                className={`btn ${selectedModel === activeModel ? 'btn-ghost' : 'btn-primary'} model-set-default-btn`}
                                disabled={selectedModel === activeModel || !selectedModel}
                                onClick={() => setShowConfirm(true)}
                            >
                                {selectedModel === activeModel ? (
                                    <><HiOutlineCheckCircle size={16} /> Đang mặc định</>
                                ) : (
                                    <><HiOutlineStar size={16} /> Đặt mặc định</>
                                )}
                            </button>
                        </div>

                        {activeModel && (
                            <div className="model-active-badge">
                                <HiOutlineCheckCircle size={14} />
                                Mô hình mặc định hiện tại: <strong>{activeModel}</strong>
                            </div>
                        )}
                    </>
                )}
            </div>

            {currentModelInfo && (
                <div className="model-details glass-card-static animate-fade-in-up stagger-2">
                    <div className="model-details-header">
                        <div className="model-details-title">
                            <HiOutlineInformationCircle size={20} />
                            <h3>Chi tiết mô hình: {currentModelInfo.name}</h3>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>
                            {showDetails ? 'Thu gọn' : 'Mở rộng'}
                        </button>
                    </div>

                    {showDetails && (
                        <div className="model-details-content">
                            <div className="model-specs-grid">
                                <div className="model-spec-item">
                                    <span className="model-spec-label">Phiên bản</span>
                                    <span className="model-spec-value">{currentModelInfo.version || 'N/A'}</span>
                                </div>
                                <div className="model-spec-item">
                                    <span className="model-spec-label">Số nhãn</span>
                                    <span className="model-spec-value">{currentModelInfo.num_labels || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="model-metrics-section">
                                <h4><HiOutlineChartBar size={16} /> Chỉ số chính</h4>
                                <div className="model-metrics-grid">
                                    <div className="model-metric-card">
                                        <span className="model-metric-value">
                                            {currentModelInfo.accuracy
                                                ? `${(currentModelInfo.accuracy * 100).toFixed(2)}%`
                                                : currentModelInfo.test_accuracy
                                                    ? `${(currentModelInfo.test_accuracy * 100).toFixed(2)}%`
                                                    : 'N/A'}
                                        </span>
                                        <span className="model-metric-label">Accuracy</span>
                                    </div>

                                    <div className="model-metric-card">
                                        <span className="model-metric-value">
                                            {currentModelInfo.f1_score
                                                ? `${(currentModelInfo.f1_score * 100).toFixed(2)}%`
                                                : 'N/A'}
                                        </span>
                                        <span className="model-metric-label">F1-Score</span>
                                    </div>

                                    <div className="model-metric-card">
                                        <span className="model-metric-value">
                                            {currentModelInfo.precision
                                                ? `${(currentModelInfo.precision * 100).toFixed(2)}%`
                                                : 'N/A'}
                                        </span>
                                        <span className="model-metric-label">Precision</span>
                                    </div>

                                    <div className="model-metric-card">
                                        <span className="model-metric-value">
                                            {currentModelInfo.recall
                                                ? `${(currentModelInfo.recall * 100).toFixed(2)}%`
                                                : 'N/A'}
                                        </span>
                                        <span className="model-metric-label">Recall</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {models.length > 1 && (
                <div className="model-compare glass-card-static animate-fade-in-up stagger-3">
                    <h3><HiOutlineChartBar size={18} /> So sánh mô hình</h3>
                    <div className="model-compare-table-wrapper">
                        <table className="table model-compare-table">
                            <thead>
                                <tr>
                                    <th>Mô hình</th>
                                    <th>Số nhãn</th>
                                    <th>Hidden Size</th>
                                    <th>Layers</th>
                                    <th>Phiên bản</th>
                                    <th>Accuracy</th>
                                    <th>F1</th>
                                </tr>
                            </thead>
                            <tbody>
                                {models.map((model) => (
                                    <tr key={model.name} className={model.name === selectedModel ? 'model-compare-selected' : ''}>
                                        <td>
                                            <div className="model-compare-name">
                                                {model.name}
                                                {model.name === activeModel && <span className="model-compare-star">⭐</span>}
                                            </div>
                                        </td>
                                        <td>{model.num_labels || '—'}</td>
                                        <td>{model.hidden_size || '—'}</td>
                                        <td>{model.num_hidden_layers || '—'}</td>
                                        <td>{model.version}</td>
                                        <td className="admin-td-confidence">
                                            {model.accuracy
                                                ? `${(model.accuracy * 100).toFixed(2)}%`
                                                : model.test_accuracy
                                                    ? `${(model.test_accuracy * 100).toFixed(2)}%`
                                                    : '—'}
                                        </td>
                                        <td className="admin-td-confidence">
                                            {model.f1_score ? `${(model.f1_score * 100).toFixed(2)}%` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="test-input-card glass-card-static animate-fade-in-up stagger-4">
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
                    <button
                        className="btn btn-primary"
                        onClick={handleTest}
                        disabled={loading || !text.trim() || !selectedModel}
                    >
                        {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <HiOutlinePaperAirplane />}
                        Test mô hình này
                    </button>
                </div>

                <div className="test-samples">
                    <span className="test-samples-label">Mẫu thử:</span>
                    <div className="test-samples-list">
                        {sampleTexts.map((sample, index) => (
                            <button key={index} className="btn btn-ghost btn-sm test-sample-btn" onClick={() => setText(sample)}>
                                {sample.slice(0, 40)}...
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {results.length > 0 && (
                <div className="test-results animate-fade-in-up stagger-5">
                    <h3>Kết quả ({results.length})</h3>
                    <div className="test-results-list">
                        {results.map((result, index) => {
                            const config = sentimentMap[result.camxuc];
                            return (
                                <div key={index} className="test-result-item glass-card animate-fade-in-up">
                                    <div className="test-result-top">
                                        <span className="test-result-emoji">{config.emoji}</span>
                                        <span className={`badge badge-${config.class}`}>{config.label}</span>
                                        <span className="test-result-confidence">{((result.tincay || 0) * 100).toFixed(1)}%</span>
                                        <span className="test-result-model">{result.model}</span>
                                    </div>
                                    <p className="test-result-text">{result.noidung}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showConfirm && (
                <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>Đặt mô hình mặc định</h3>
                        <p>
                            Bạn có chắc muốn đặt <strong>"{selectedModel}"</strong> làm mô hình mặc định
                            cho tất cả người dùng phân tích cảm xúc?
                        </p>
                        <div className="confirm-actions">
                            <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
                                Hủy
                            </button>
                            <button className="btn btn-primary" onClick={handleSetActive} disabled={settingActive}>
                                {settingActive ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestModelPage;
