/* ═══════════════════════════════════════════════════
   Auth Callback Page
   ═══════════════════════════════════════════════════ */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const tokenType = searchParams.get('token_type');
        const vaitro = searchParams.get('vaitro');
        const tkId = searchParams.get('tk_id');

        if (token && tokenType && vaitro && tkId) {
            const result = {
                access_token: token,
                token_type: tokenType,
                vaitro: vaitro as 'user' | 'admin',
                tk_id: parseInt(tkId),
            };
            login(result);
            toast.success('Đăng nhập thành công!');
            navigate(result.vaitro === 'admin' ? '/admin/dashboard' : '/home');
        } else {
            toast.error('Đăng nhập thất bại. Vui lòng thử lại.');
            navigate('/login');
        }
    }, [searchParams, login, navigate]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
            <p style={{ marginLeft: 16, color: 'white' }}>Đang xử lý đăng nhập...</p>
        </div>
    );
};

export default AuthCallbackPage;