/* ═══════════════════════════════════════════════════
   Admin Dashboard Page
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import {
    HiOutlineChartBar,
    HiOutlineUsers,
    HiOutlineDocumentText,
    HiOutlineSparkles,
    HiOutlinePencilSquare,
    HiOutlineFaceSmile,
    HiOutlineFaceFrown,
    HiOutlineMinusCircle,
} from 'react-icons/hi2';
import { adminService } from '../../services/adminService';
import type { DashboardStats } from '../../types';
import toast from 'react-hot-toast';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminService.getDashboard();
                setStats(data);
            } catch {
                toast.error('Không thể tải dữ liệu dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
    if (!stats) return null;

    const statCards = [
        { icon: <HiOutlineUsers />, label: 'Tài khoản', value: stats.tong_taikhoan, color: 'primary' },
        { icon: <HiOutlineDocumentText />, label: 'Văn bản', value: stats.tong_vanban, color: 'accent' },
        { icon: <HiOutlineSparkles />, label: 'Kết quả', value: stats.tong_ketqua, color: 'cyan' },
        { icon: <HiOutlinePencilSquare />, label: 'Sửa nhãn', value: stats.tong_suanhan, color: 'warning' },
    ];

    const sentimentData = [
        { key: 'positive', label: 'Tích cực', icon: <HiOutlineFaceSmile />, class: 'positive' },
        { key: 'negative', label: 'Tiêu cực', icon: <HiOutlineFaceFrown />, class: 'negative' },
        { key: 'neutral', label: 'Trung tính', icon: <HiOutlineMinusCircle />, class: 'neutral' },
    ];

    const totalSentiment = Object.values(stats.phan_bo_camxuc).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="dashboard-page">
            <div className="dashboard-header animate-fade-in-down">
                <h1><HiOutlineChartBar /> Dashboard</h1>
                <p>Tổng quan hệ thống phân tích cảm xúc</p>
            </div>

            {/* Stat Cards */}
            <div className="dashboard-stats-grid">
                {statCards.map((card, i) => (
                    <div key={i} className={`dashboard-stat-card glass-card animate-fade-in-up stagger-${i + 1}`}>
                        <div className={`dashboard-stat-icon dashboard-stat-icon-${card.color}`}>
                            {card.icon}
                        </div>
                        <div className="dashboard-stat-info">
                            <span className="dashboard-stat-value">{card.value.toLocaleString()}</span>
                            <span className="dashboard-stat-label">{card.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sentiment Distribution */}
            <div className="dashboard-row">
                <div className="dashboard-sentiment glass-card-static animate-fade-in-up stagger-5">
                    <h3>Phân bố cảm xúc</h3>
                    <div className="dashboard-sentiment-bars">
                        {sentimentData.map((s) => {
                            const count = stats.phan_bo_camxuc[s.key] || 0;
                            const pct = ((count / totalSentiment) * 100).toFixed(1);
                            return (
                                <div key={s.key} className="dashboard-sentiment-item">
                                    <div className="dashboard-sentiment-header">
                                        <span className={`badge badge-${s.class}`}>{s.icon} {s.label}</span>
                                        <span className="dashboard-sentiment-count">{count} ({pct}%)</span>
                                    </div>
                                    <div className="dashboard-sentiment-bar-bg">
                                        <div
                                            className={`dashboard-sentiment-bar-fill dashboard-bar-${s.class}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Daily Trend */}
                <div className="dashboard-trend glass-card-static animate-fade-in-up stagger-6">
                    <h3>Xu hướng theo ngày</h3>
                    {stats.vanban_theo_ngay.length === 0 ? (
                        <p className="dashboard-empty">Chưa có dữ liệu xu hướng.</p>
                    ) : (
                        <div className="dashboard-trend-list">
                            {stats.vanban_theo_ngay.slice(-10).map((item, i) => (
                                <div key={i} className="dashboard-trend-item">
                                    <span className="dashboard-trend-date">
                                        {new Date(item.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <div className="dashboard-trend-bar-bg">
                                        <div
                                            className="dashboard-trend-bar-fill"
                                            style={{
                                                width: `${Math.min(100, (item.so_luong / Math.max(...stats.vanban_theo_ngay.map(d => d.so_luong), 1)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="dashboard-trend-count">{item.so_luong}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
