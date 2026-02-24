/* ═══════════════════════════════════════════════════
   Admin service – dashboard, labels, export
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

export const adminService = {
    getDashboard: async (): Promise<DashboardStats> => {
        const res = await api.get(`${ADMIN_PREFIX}/dashboard`);
        return res.data;
    },

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

    exportData: async (
        page = 1,
        pageSize = 100,
    ): Promise<ExportResponse> => {
        const res = await api.get(`${ADMIN_PREFIX}/export`, {
            params: { page, page_size: pageSize },
        });
        return res.data;
    },
};
