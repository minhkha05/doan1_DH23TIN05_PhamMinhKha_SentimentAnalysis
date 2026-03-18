/* ═══════════════════════════════════════════════════
   App – Root router configuration
   ═══════════════════════════════════════════════════ */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/guards/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Public pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'));
const FreeTrialPage = lazy(() => import('./pages/public/FreeTrialPage'));
const AuthCallbackPage = lazy(() => import('./pages/public/AuthCallbackPage'));

// User pages
const HomePage = lazy(() => import('./pages/user/HomePage'));
const HistoryPage = lazy(() => import('./pages/user/HistoryPage'));
const ProfilePage = lazy(() => import('./pages/user/ProfilePage'));

// Admin pages
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const LabelsPage = lazy(() => import('./pages/admin/LabelsPage'));
const TestModelPage = lazy(() => import('./pages/admin/TestModelPage'));
const ExportPage = lazy(() => import('./pages/admin/ExportPage'));
const TextsPage = lazy(() => import('./pages/admin/TextsPage'));

const RouteFallback: React.FC = () => (
  <div className="page-loader" aria-live="polite" aria-busy="true">
    <div className="spinner" />
    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Đang tải trang...</span>
  </div>
);

const App: React.FC = () => {
  useEffect(() => {
    const preloaders = [
      () => import('./pages/user/HomePage'),
      () => import('./pages/user/HistoryPage'),
      () => import('./pages/admin/DashboardPage'),
      () => import('./pages/admin/UsersPage'),
      () => import('./pages/admin/ExportPage'),
    ];

    const runPrefetch = () => {
      for (const load of preloaders) {
        void load();
      }
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(runPrefetch, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }

    const timeoutId = window.setTimeout(runPrefetch, 700);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* ── Public routes ─────────────────────── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/try" element={<FreeTrialPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* ── Protected routes (user) ───────────── */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<HomePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* ── Protected routes (admin) ──────────── */}
              <Route
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/texts" element={<TextsPage />} />
                <Route path="/admin/labels" element={<LabelsPage />} />
                <Route path="/admin/test-model" element={<TestModelPage />} />
                <Route path="/admin/export" element={<ExportPage />} />
              </Route>

              {/* ── Fallback ──────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              boxShadow: 'var(--shadow-lg)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
