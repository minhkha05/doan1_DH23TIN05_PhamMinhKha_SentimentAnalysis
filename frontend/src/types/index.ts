/* ═══════════════════════════════════════════════════
   Type definitions – maps exactly to backend schemas
   ═══════════════════════════════════════════════════ */

// ── Enums ─────────────────────────────────────────
export type VaiTro = 'user' | 'admin';
export type DangNhap = 'email' | 'sodienthoai';
export type CamXuc = 'negative' | 'positive' | 'neutral';

// ── Auth ──────────────────────────────────────────
export interface RegisterRequest {
    email?: string;
    sdt?: string;
    matkhau: string;
}

export interface LoginRequest {
    email?: string;
    sdt?: string;
    matkhau: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    vaitro: VaiTro;
    tk_id: number;
}

export interface UserProfile {
    tk_id: number;
    tk_email: string | null;
    tk_sdt: string | null;
    tk_vaitro: VaiTro;
    tk_dangnhap: DangNhap;
    tk_taoluc: string | null;
}

export interface SuccessResponse {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
}

// ── Analysis ──────────────────────────────────────
export interface AnalyzeRequest {
    noidung: string;
}

export interface KetQuaResponse {
    kq_id: number;
    vb_id: number;
    noidung: string;
    camxuc: CamXuc;
    tincay: number | null;
    model: string | null;
    luclay: string | null;
}

export interface AnalyzeResponse {
    success: boolean;
    data: KetQuaResponse;
}

export interface BatchAnalyzeItem {
    index: number;
    noidung: string;
    camxuc: CamXuc | null;
    tincay: number | null;
    model: string | null;
    vb_id?: number | null;
    kq_id?: number | null;
    error?: string | null;
}

export interface BatchAnalyzeResponse {
    success: boolean;
    total_rows: number;
    success_count: number;
    failed_count: number;
    items: BatchAnalyzeItem[];
}

// ── History ───────────────────────────────────────
export interface HistoryItem {
    vb_id: number;
    noidung: string;
    camxuc: CamXuc | null;
    tincay: number | null;
    model: string | null;
    vb_taoluc: string | null;
    camxuc_dasua: CamXuc | null;
}

// ── Admin ─────────────────────────────────────────
export interface DashboardStats {
    tong_taikhoan: number;
    tong_vanban: number;
    tong_ketqua: number;
    tong_suanhan: number;
    phan_bo_camxuc: Record<string, number>;
    vanban_theo_ngay: Array<{ ngay: string; so_luong: number }>;
}

export interface LabelUpdateRequest {
    vb_id: number;
    camxuc_moi: CamXuc;
}

export interface LabelUpdateResponse {
    sn_id: number;
    vb_id: number;
    camxuc_cu: CamXuc | null;
    camxuc_moi: CamXuc;
    nguoi_sua: number;
    luc_sua: string | null;
}

export interface ExportItem {
    vb_id: number;
    noidung: string;
    camxuc_ai: CamXuc | null;
    tincay: number | null;
    camxuc_suanhan: CamXuc | null;
    camxuc_final: CamXuc | null;
    model_ai: string | null;
    thoigian_phan_tich: string | null;
    vb_taoluc: string | null;
}

export interface ExportResponse {
    success: boolean;
    xd_id: number;
    file: string;
    sodong: number;
    items: ExportItem[];
}

export type ExportFileFormat = 'csv' | 'xlsx';

export interface ExportDownloadMeta {
    xd_id: number;
    file: string;
    sodong: number;
}

export interface ExportPreviewItem {
    noidung: string;
    camxuc: CamXuc | null;
    tincay: number | null;
    model_ai: string | null;
    thoigian_phan_tich: string | null;
}

export interface ExportHistoryRow {
    xd_id: number;
    ten_file: string;
    so_dong: number;
    nguoi_xuat: string;
    thoigian_xuat: string | null;
}

// ── Pagination ────────────────────────────────────
export interface PaginatedResponse<T> {
    success: boolean;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: T[];
}

// ── Error ─────────────────────────────────────────
export interface ApiError {
    success: false;
    detail: string;
}

// ── Password Change ───────────────────────────────
export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}
// ── Phone Update ───────────────────────────────────
export interface UpdatePhoneRequest {
    sdt: string;
}
// ── Admin Text Management ─────────────────────────
export interface AdminTextItem {
    vb_id: number;
    noidung: string;
    user_email: string | null;
    user_sdt: string | null;
    camxuc_ai: CamXuc | null;
    tincay: number | null;
    vb_taoluc: string | null;
}
