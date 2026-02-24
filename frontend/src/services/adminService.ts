/* ═══════════════════════════════════════════════════
   Admin service – dashboard, users, labels, export
   ═══════════════════════════════════════════════════ */

import api from './api';
import type {
    DashboardStats,
    ExportItem,
    ExportResponse,
    LabelUpdateRequest,
    LabelUpdateResponse,
    PaginatedResponse,
} from '../types';

const ADMIN_PREFIX = '/api/v1/admin';

export interface AdminUserItem {
    tk_id: number;
    tk_email: string | null;
    tk_sdt: string | null;
    tk_vaitro: 'user' | 'admin';
    tk_dangnhap: 'email' | 'sodienthoai';
    tk_xoa: boolean;
    tk_taoluc: string | null;
    tk_loginluc: string | null;
    tong_vanban: number;
}

export interface ModelInfo {
    name: string;
    path: string;
    architecture: string;
    num_labels: number;
    model_type: string;
    version: string;
    techniques: string[];
}

export const adminService = {
    getDashboard: async (): Promise<DashboardStats> => {
        const res = await api.get(`${ADMIN_PREFIX}/dashboard`);
        return res.data;
    },

    // ── User management ───────────────────────────
    getUsers: async (params: {
        page?: number;
        page_size?: number;
        search?: string;
        role?: string;
        status?: string;
    }): Promise<PaginatedResponse<AdminUserItem>> => {
        const res = await api.get(`${ADMIN_PREFIX}/users`, { params });
        return res.data;
    },

    updateUserRole: async (userId: number, vaitro: string): Promise<any> => {
        const res = await api.put(`${ADMIN_PREFIX}/users/${userId}/role`, { vaitro });
        return res.data;
    },

    updateUserStatus: async (userId: number, xoa: boolean): Promise<any> => {
        const res = await api.put(`${ADMIN_PREFIX}/users/${userId}/status`, { xoa });
        return res.data;
    },

    // ── Labels ─────────────────────────────────────
    getLabels: async (
        page = 1,
        pageSize = 20,
    ): Promise<PaginatedResponse<ExportItem>> => {
        const res = await api.get(`${ADMIN_PREFIX}/labels`, {
            params: { page, page_size: pageSize },
        });
        return res.data;
    },

    updateLabel: async (data: LabelUpdateRequest): Promise<LabelUpdateResponse> => {
        const res = await api.put(`${ADMIN_PREFIX}/labels`, data);
        return res.data;
    },

    // ── Export ──────────────────────────────────────
    exportData: async (
        page = 1,
        pageSize = 100,
    ): Promise<ExportResponse> => {
        const res = await api.get(`${ADMIN_PREFIX}/export`, {
            params: { page, page_size: pageSize },
        });
        return res.data;
    },

    // ── Model management ───────────────────────────
    getModels: async (): Promise<{ models: ModelInfo[]; active_model: string | null }> => {
        const res = await api.get(`${ADMIN_PREFIX}/models`);
        return res.data;
    },

    testModel: async (noidung: string, model_name: string): Promise<any> => {
        const res = await api.post(`${ADMIN_PREFIX}/models/test`, { noidung, model_name });
        return res.data;
    },

    setActiveModel: async (model_name: string): Promise<any> => {
        const res = await api.put(`${ADMIN_PREFIX}/models/active`, { model_name });
        return res.data;
    },
};
