/* ═══════════════════════════════════════════════════
   Axios instance with JWT interceptor
   ═══════════════════════════════════════════════════ */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// ── Request interceptor: attach JWT ──────────────
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 ─────────────
// Don't redirect for public endpoints (free trial, forgot password, etc.)
const PUBLIC_ENDPOINTS = [
    '/analyze-free',
    '/analyze-free-batch',
    '/forgot-password',
    '/verify-reset-code',
    '/reset-password',
    '/login',
    '/register',
];

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            const isPublic = PUBLIC_ENDPOINTS.some((ep) => url.includes(ep));
            if (!isPublic) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default api;
