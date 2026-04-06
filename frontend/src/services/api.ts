/* ═══════════════════════════════════════════════════
   Axios instance with JWT interceptor
   ═══════════════════════════════════════════════════ */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const isBrowser = typeof window !== 'undefined';
const isLocalRuntime =
    isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API_BASE_URL = rawApiBaseUrl || (isLocalRuntime ? 'http://localhost:8000' : '');

if (!API_BASE_URL) {
    console.error(
        'Missing VITE_API_BASE_URL for non-local runtime. Configure it in your deployment environment.',
    );
}

export const getApiBaseUrl = (): string => API_BASE_URL;

const api = axios.create({
    baseURL: API_BASE_URL || undefined,
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
