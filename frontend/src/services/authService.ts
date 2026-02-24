/* ═══════════════════════════════════════════════════
   Auth service – register, login, profile
   ═══════════════════════════════════════════════════ */

import api from './api';
import type {
    LoginRequest,
    RegisterRequest,
    SuccessResponse,
    TokenResponse,
    UserProfile,
} from '../types';

const AUTH_PREFIX = '/api/v1/auth';

export const authService = {
    register: async (data: RegisterRequest): Promise<SuccessResponse> => {
        const res = await api.post(`${AUTH_PREFIX}/register`, data);
        return res.data;
    },

    login: async (data: LoginRequest): Promise<TokenResponse> => {
        const res = await api.post(`${AUTH_PREFIX}/login`, data);
        return res.data;
    },

    getProfile: async (): Promise<UserProfile> => {
        const res = await api.get(`${AUTH_PREFIX}/profile`);
        return res.data;
    },
};
