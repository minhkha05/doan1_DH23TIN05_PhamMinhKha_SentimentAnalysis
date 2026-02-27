/* ═══════════════════════════════════════════════════
   User service – analyze, history
   ═══════════════════════════════════════════════════ */

import api from './api';
import type {
    AnalyzeRequest,
    AnalyzeResponse,
    ChangePasswordRequest,
    HistoryItem,
    PaginatedResponse,
    SuccessResponse,
} from '../types';

const USER_PREFIX = '/api/v1/user';

export const userService = {
    analyzeText: async (data: AnalyzeRequest): Promise<AnalyzeResponse> => {
        const res = await api.post(`${USER_PREFIX}/analyze`, data);
        return res.data;
    },

    getHistory: async (
        page = 1,
        pageSize = 20,
    ): Promise<PaginatedResponse<HistoryItem>> => {
        const res = await api.get(`${USER_PREFIX}/history`, {
            params: { page, page_size: pageSize },
        });
        return res.data;
    },

    deleteHistoryItem: async (vbId: number): Promise<SuccessResponse> => {
        const res = await api.delete(`${USER_PREFIX}/history/${vbId}`);
        return res.data;
    },

    clearHistory: async (): Promise<SuccessResponse> => {
        const res = await api.delete(`${USER_PREFIX}/history/clear`);
        return res.data;
    },

    changePassword: async (data: ChangePasswordRequest): Promise<SuccessResponse> => {
        const res = await api.put(`${USER_PREFIX}/password`, data);
        return res.data;
    },

    updatePhone: async (sdt: string): Promise<SuccessResponse> => {
        const res = await api.put(`${USER_PREFIX}/phone`, { sdt });
        return res.data;
    },
};
