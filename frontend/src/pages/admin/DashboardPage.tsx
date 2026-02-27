/* ═══════════════════════════════════════════════════
   Admin Dashboard Page – with Recharts visualizations
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
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area,
} from 'recharts';
import { adminService } from '../../services/adminService';
import type { DashboardStats } from '../../types';
import toast from 'react-hot-toast';
import './DashboardPage.css';

const SENTIMENT_COLORS: Record<string, string> = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#f59e0b',
};

const SENTIMENT_LABELS: Record<string, string> = {
    positive: 'Tích cực',
    negative: 'Tiêu cực',
    neutral: 'Trung tính',
};

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

    // Pie chart data
    const pieData = Object.entries(stats.phan_bo_camxuc).map(([key, value]) => ({
        name: SENTIMENT_LABELS[key] || key,
        value,
        key,
    }));

    // Bar chart data for daily trend
    const barData = stats.vanban_theo_ngay.slice(-15).map((item) => ({
        ngay: new Date(item.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        'Văn bản': item.so_luong,
    }));

    // Custom tooltip for pie
    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const pct = ((data.value / totalSentiment) * 100).toFixed(1);
            return (
                <div className="dashboard-chart-tooltip">
                    <strong>{data.name}</strong>
                    <span>{data.value} ({pct}%)</span>
                </div>
            );
        }
        return null;
    };

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

            {/* ── Charts Row ──────────────────────────── */}
            <div className="dashboard-row">
                {/* Pie Chart – Sentiment Distribution */}
                <div className="dashboard-sentiment glass-card-static animate-fade-in-up stagger-5">
                    <h3>Phân bố cảm xúc</h3>
                    {pieData.length === 0 ? (
                        <p className="dashboard-empty">Chưa có dữ liệu.</p>
                    ) : (
                        <div className="dashboard-chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry) => (
                                            <Cell key={entry.key} fill={SENTIMENT_COLORS[entry.key] || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Summary badges */}
                            <div className="dashboard-sentiment-summary">
                                {sentimentData.map((s) => {
                                    const count = stats.phan_bo_camxuc[s.key] || 0;
                                    const pct = ((count / totalSentiment) * 100).toFixed(1);
                                    return (
                                        <div key={s.key} className="dashboard-sentiment-badge">
                                            <span className={`badge badge-${s.class}`}>{s.icon} {s.label}</span>
                                            <span className="dashboard-sentiment-badge-val">{count} ({pct}%)</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bar Chart – Daily Trend */}
                <div className="dashboard-trend glass-card-static animate-fade-in-up stagger-6">
                    <h3>Xu hướng theo ngày</h3>
                    {barData.length === 0 ? (
                        <p className="dashboard-empty">Chưa có dữ liệu xu hướng.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                <XAxis
                                    dataKey="ngay"
                                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'var(--border-light)' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: 8,
                                        fontSize: 13,
                                    }}
                                />
                                <Bar dataKey="Văn bản" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Area Chart – Cumulative trend ───────── */}
            {stats.vanban_theo_ngay.length > 1 && (
                <div className="dashboard-area-chart glass-card-static animate-fade-in-up stagger-7">
                    <h3>Tổng lượng văn bản tích lũy</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart
                            data={stats.vanban_theo_ngay.slice(-15).reduce((acc: any[], item, i) => {
                                const prev = i > 0 ? acc[i - 1]['Tổng'] : 0;
                                acc.push({
                                    ngay: new Date(item.ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                                    'Tổng': prev + item.so_luong,
                                });
                                return acc;
                            }, [])}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                            <XAxis
                                dataKey="ngay"
                                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border-light)' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: 8,
                                    fontSize: 13,
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Tổng"
                                stroke="#a78bfa"
                                strokeWidth={2}
                                fill="url(#areaGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
