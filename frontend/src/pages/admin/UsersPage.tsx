/* ═══════════════════════════════════════════════════
   Admin Users Page (read-only list from dashboard stats)
   Since there's no dedicated user list endpoint, 
   we display user count from dashboard and profile info.
   ═══════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineInformationCircle } from 'react-icons/hi2';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import './AdminPages.css';

const UsersPage: React.FC = () => {
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const stats = await adminService.getDashboard();
                setTotalUsers(stats.tong_taikhoan);
            } catch {
                toast.error('Không thể tải dữ liệu.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;

    return (
        <div className="admin-page">
            <div className="admin-page-header animate-fade-in-down">
                <h1><HiOutlineUsers /> Quản lý người dùng</h1>
                <p>Tổng quan tài khoản hệ thống</p>
            </div>

            <div className="admin-info-card glass-card-static animate-fade-in-up stagger-1">
                <div className="admin-big-stat">
                    <div className="admin-big-stat-icon">
                        <HiOutlineUsers size={32} />
                    </div>
                    <div>
                        <span className="admin-big-stat-value">{totalUsers}</span>
                        <span className="admin-big-stat-label">Tổng số tài khoản</span>
                    </div>
                </div>
            </div>

            <div className="admin-notice glass-card-static animate-fade-in-up stagger-2">
                <HiOutlineInformationCircle size={20} />
                <p>
                    API hiện tại chưa hỗ trợ endpoint liệt kê danh sách chi tiết người dùng.
                    Thông tin này được lấy từ Dashboard Stats.
                    Tính năng quản lý chi tiết sẽ được mở rộng trong phiên bản tiếp theo.
                </p>
            </div>
        </div>
    );
};

export default UsersPage;
