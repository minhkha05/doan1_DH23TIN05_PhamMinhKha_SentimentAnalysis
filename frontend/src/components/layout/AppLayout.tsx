/* ═══════════════════════════════════════════════════
   AppLayout – sidebar + content area
   ═══════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './AppLayout.css';

const MOBILE_BREAKPOINT = 768;

const getInitialCollapsedState = (): boolean => {
    try {
        return localStorage.getItem('sidebar_collapsed') === '1';
    } catch {
        return false;
    }
};

const AppLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsedState);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean>(() =>
        window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches,
    );

    useEffect(() => {
        const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const onChange = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };

        setIsMobile(media.matches);
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', onChange);
            return () => media.removeEventListener('change', onChange);
        }

        media.addListener(onChange);
        return () => media.removeListener(onChange);
    }, []);

    useEffect(() => {
        if (!isMobile) {
            setMobileOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (isMobile) return;
        localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0');
    }, [collapsed, isMobile]);

    useEffect(() => {
        if (!isMobile) return;
        const previousOverflow = document.body.style.overflow;
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = previousOverflow || '';
        }
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobile, mobileOpen]);

    useEffect(() => {
        if (!mobileOpen) return;
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileOpen(false);
            }
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [mobileOpen]);

    const handleToggleCollapsed = useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []);

    const handleToggleMobile = useCallback(() => {
        setMobileOpen((prev) => !prev);
    }, []);

    const handleCloseMobile = useCallback(() => {
        setMobileOpen(false);
    }, []);

    const layoutClassName = useMemo(() => {
        return `app-layout${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`;
    }, [collapsed, mobileOpen]);

    return (
        <div className={layoutClassName}>
            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                isMobile={isMobile}
                onToggleCollapsed={handleToggleCollapsed}
                onToggleMobile={handleToggleMobile}
                onCloseMobile={handleCloseMobile}
            />
            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AppLayout;
