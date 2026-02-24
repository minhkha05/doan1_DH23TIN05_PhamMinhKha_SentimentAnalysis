/* ═══════════════════════════════════════════════════
   User service – analyze, history
   ═══════════════════════════════════════════════════ */

import api from './api';
import type {
    AnalyzeRequest,
    AnalyzeResponse,
    HistoryItem,
    PaginatedResponse,
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
};
