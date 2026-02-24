/* ═══════════════════════════════════════════════════
   Protected Route – guards based on auth & role
   ═══════════════════════════════════════════════════ */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { VaiTro } from '../../types';

interface Props {
    children: React.ReactNode;
    requiredRole?: VaiTro;
}

const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
    const { isAuthenticated, isLoading, role } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="page-loader">
                <div className="spinner" />
                <span style={{ color: 'var(--text-tertiary)' }}>Đang tải...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && role !== requiredRole) {
        return <Navigate to="/home" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
