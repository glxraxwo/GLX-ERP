import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '../../hooks/useSocket';

export default function AppLayout() {
    const { user } = useAuthStore();
    const location = useLocation();
    // Desktop: open by default (>=1024px) or read from localStorage, mobile: closed
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebar_open');
        if (saved !== null && window.innerWidth >= 1024) return saved === 'true';
        return window.innerWidth >= 1024;
    });

    const toggleSidebar = () => {
        setSidebarOpen(prev => {
            const next = !prev;
            if (window.innerWidth >= 1024) {
                localStorage.setItem('sidebar_open', String(next));
            }
            return next;
        });
    };

    // Initialize real-time notifications
    useSocket();

    // Auto-close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, [location.pathname]);

    // Handle resize: open sidebar when going to desktop, close when going mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                const saved = localStorage.getItem('sidebar_open');
                setSidebarOpen(saved !== null ? saved === 'true' : true);
            } else {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="h-screen flex bg-gray-50 overflow-hidden">
            <Sidebar
                userRole={user?.role}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header onToggleSidebar={toggleSidebar} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}