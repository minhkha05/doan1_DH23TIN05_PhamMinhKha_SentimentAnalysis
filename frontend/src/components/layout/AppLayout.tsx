/* ═══════════════════════════════════════════════════
   AppLayout – sidebar + content area
   ═══════════════════════════════════════════════════ */

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './AppLayout.css';

const AppLayout: React.FC = () => {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AppLayout;
