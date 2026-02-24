/* ═══════════════════════════════════════════════════
   Auth Context – global authentication state
   ═══════════════════════════════════════════════════ */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { TokenResponse, UserProfile, VaiTro } from '../types';
import { authService } from '../services/authService';

interface AuthState {
    token: string | null;
    user: UserProfile | null;
    role: VaiTro | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

interface AuthContextType extends AuthState {
    login: (data: TokenResponse) => void;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        token: localStorage.getItem('access_token'),
        user: null,
        role: (localStorage.getItem('user_role') as VaiTro) || null,
        isAuthenticated: !!localStorage.getItem('access_token'),
        isLoading: true,
    });

    const refreshProfile = useCallback(async () => {
        try {
            const profile = await authService.getProfile();
            setState((prev) => ({
                ...prev,
                user: profile,
                role: profile.tk_vaitro,
                isLoading: false,
            }));
            localStorage.setItem('user_role', profile.tk_vaitro);
        } catch {
            setState((prev) => ({
                ...prev,
                token: null,
                user: null,
                role: null,
                isAuthenticated: false,
                isLoading: false,
            }));
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_role');
        }
    }, []);

    useEffect(() => {
        if (state.token) {
            refreshProfile();
        } else {
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    }, [state.token, refreshProfile]);

    const login = useCallback((data: TokenResponse) => {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', data.vaitro);
        setState({
            token: data.access_token,
            user: null,
            role: data.vaitro,
            isAuthenticated: true,
            isLoading: true,
        });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        setState({
            token: null,
            user: null,
            role: null,
            isAuthenticated: false,
            isLoading: false,
        });
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
