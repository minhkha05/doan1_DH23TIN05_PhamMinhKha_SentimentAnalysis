/* ═══════════════════════════════════════════════════
   Admin service – dashboard, users, labels, export
   ═══════════════════════════════════════════════════ */

import api from './api';
import type {
    AdminTextItem,
    BatchAnalyzeResponse,
    CamXuc,
    DashboardStats,
    ExportDownloadMeta,
    ExportFileFormat,
    ExportHistoryRow,
    ExportItem,
    ExportPreviewItem,
    ExportResponse,
    LabelUpdateRequest,
    LabelUpdateResponse,
    PaginatedResponse,
    SuccessResponse,
} from '../types';
import type { AxiosResponse } from 'axios';

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
    hidden_size?: number;
    num_hidden_layers?: number;
    num_attention_heads?: number;
    vocab_size?: number;
    max_position_embeddings?: number;
    problem_type?: string;
    // Training metrics (optional)
    accuracy?: number;
    test_accuracy?: number;
    val_accuracy?: number;
    f1_score?: number;
    precision?: number;
    recall?: number;
    train_loss?: number;
    val_loss?: number;
    epochs?: number;
    learning_rate?: number;
    batch_size?: number;
    train_samples?: number;
    val_samples?: number;
}

export interface TestModelResult {
    camxuc: CamXuc;
    tincay: number;
    noidung: string;
    model: string;
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
    }, signal?: AbortSignal): Promise<PaginatedResponse<AdminUserItem>> => {
        const res = await api.get(`${ADMIN_PREFIX}/users`, { params, signal });
        return res.data;
    },

    updateUserRole: async (userId: number, vaitro: string): Promise<SuccessResponse> => {
        const res = await api.put(`${ADMIN_PREFIX}/users/${userId}/role`, { vaitro });
        return res.data;
    },

    updateUserStatus: async (userId: number, xoa: boolean): Promise<SuccessResponse> => {
        const res = await api.put(`${ADMIN_PREFIX}/users/${userId}/status`, { xoa });
        return res.data;
    },

    deleteUser: async (userId: number): Promise<SuccessResponse> => {
        const res = await api.delete(`${ADMIN_PREFIX}/users/${userId}`);
        return res.data;
    },

    updateUserPhone: async (userId: number, sdt: string): Promise<SuccessResponse> => {
        const res = await api.put(`${ADMIN_PREFIX}/users/${userId}/phone`, { sdt });
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

    downloadExportFile: async (params: {
        start_date?: string;
        end_date?: string;
        sentiment?: CamXuc;
        model_ai?: string;
        file_format: ExportFileFormat;
    }): Promise<{ blob: Blob; meta: ExportDownloadMeta }> => {
        const res: AxiosResponse<Blob> = await api.get(`${ADMIN_PREFIX}/export/download`, {
            params,
            responseType: 'blob',
        });

        const xdId = Number(res.headers['x-export-id'] || 0);
        const fallbackFile = `export.${params.file_format}`;

        const contentDisposition = String(res.headers['content-disposition'] || '');
        const dispositionMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        const fileFromDisposition = dispositionMatch?.[1];

        const file = String(res.headers['x-export-file'] || fileFromDisposition || fallbackFile);
        const sodong = Number(res.headers['x-export-rows'] || 0);

        return {
            blob: res.data,
            meta: {
                xd_id: xdId,
                file,
                sodong,
            },
        };
    },

    getExportPreview: async (params: {
        page?: number;
        page_size?: number;
        start_date?: string;
        end_date?: string;
        sentiment?: CamXuc;
        model_ai?: string;
    }, signal?: AbortSignal): Promise<PaginatedResponse<ExportPreviewItem>> => {
        const res = await api.get(`${ADMIN_PREFIX}/export/preview`, { params, signal });
        return res.data;
    },

    getExportHistory: async (
        page = 1,
        pageSize = 20,
    ): Promise<PaginatedResponse<ExportHistoryRow>> => {
        const res = await api.get(`${ADMIN_PREFIX}/export/history`, {
            params: { page, page_size: pageSize },
        });
        return res.data;
    },

    // ── Model management ───────────────────────────
    getModels: async (): Promise<{ models: ModelInfo[]; active_model: string | null }> => {
        const res = await api.get(`${ADMIN_PREFIX}/models`);
        return res.data;
    },

    testModel: async (noidung: string, model_name: string): Promise<TestModelResult> => {
        const res = await api.post(`${ADMIN_PREFIX}/models/test`, { noidung, model_name });
        return res.data;
    },

    testModelBatch: async (file: File, model_name: string): Promise<BatchAnalyzeResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_name', model_name);
        const res = await api.post(`${ADMIN_PREFIX}/models/test-batch`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    setActiveModel: async (model_name: string): Promise<SuccessResponse> => {
        const res = await api.put(`${ADMIN_PREFIX}/models/active`, { model_name });
        return res.data;
    },

    // ── Texts management ───────────────────────────
    getTexts: async (params: {
        page?: number;
        page_size?: number;
        search?: string;
    }, signal?: AbortSignal): Promise<PaginatedResponse<AdminTextItem>> => {
        const res = await api.get(`${ADMIN_PREFIX}/texts`, { params, signal });
        return res.data;
    },

    deleteText: async (vbId: number): Promise<SuccessResponse> => {
        const res = await api.delete(`${ADMIN_PREFIX}/texts/${vbId}`);
        return res.data;
    },

    analyzeBatch: async (file: File): Promise<BatchAnalyzeResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`${ADMIN_PREFIX}/analyze-batch`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};
