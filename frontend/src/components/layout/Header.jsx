import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, Sparkles, LayoutDashboard, Palette, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';
import { authApi } from '../../features/auth/authApi';
import NotificationDropdown from '../ui/NotificationDropdown';

export default function Header({ onToggleSidebar }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { themeMode, setThemeMode } = useThemeStore();
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const themeMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
                setShowThemeMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // Even if backend fails, log out locally
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const roleLabel = {
        admin: 'Administrator',
        manager: 'Manager',
        accountant: 'Accountant',
        sales_manager: 'Sales Manager',
        sales_rep: 'Sales Rep',
        warehouse_staff: 'Warehouse Staff',
        production_staff: 'Production Staff',
        staff: 'Staff',
    }[user?.role] || 'User';

    const headerBg = {
        [THEME_MODES.SOFT]: 'bg-[#F8FAFC] border-b border-slate-200',
        [THEME_MODES.PURE]: 'bg-white border-b border-gray-200',
        [THEME_MODES.DARK]: 'bg-white border-b border-gray-200',
    }[themeMode] || 'bg-[#F8FAFC] border-b border-slate-200';

    return (
        <header className={`no-print h-14 sm:h-16 ${headerBg} flex items-center justify-between px-3 sm:px-6 flex-shrink-0 transition-colors duration-200`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Hamburger toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0 cursor-pointer"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>

                {/* Dashboard Quick Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-blue-50/80 border border-gray-200 hover:border-blue-300 rounded-lg transition shadow-xs cursor-pointer"
                    title="Go to Dashboard"
                >
                    <LayoutDashboard size={16} className="text-blue-600" />
                    <span>Dashboard</span>
                </button>
                
                {/* Welcome pill — hidden on small screens */}
                <div 
                    onClick={() => navigate('/profile')}
                    className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-primary-50 to-blue-50/20 rounded-full border border-primary-100/50 shadow-sm hover:shadow transition duration-200 cursor-pointer"
                    title="View Profile"
                >
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                        <Sparkles size={9} className="animate-pulse" />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[200px] font-medium">
                        <span className="hidden sm:inline">Welcome, </span>
                        <span className="font-bold text-primary-700">{user?.fullName || user?.firstName || 'User'}</span>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                {/* Theme / Background Tone Selector */}
                <div className="relative" ref={themeMenuRef}>
                    <button
                        onClick={() => setShowThemeMenu((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition shadow-2xs cursor-pointer ${
                            themeMode === THEME_MODES.SOFT
                                ? 'bg-slate-200/80 hover:bg-slate-300/80 border-slate-300 text-slate-800'
                                : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                        }`}
                        title="Change Background Tone"
                    >
                        <Palette size={14} className="text-slate-600" />
                        <span className="hidden sm:inline">
                            {themeMode === THEME_MODES.SOFT ? '☁️ Soft' : (themeMode === THEME_MODES.PURE ? '⚪ White' : '🌑 Dark')}
                        </span>
                    </button>

                    {showThemeMenu && (
                        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Background Tone
                            </p>
                            <button
                                type="button"
                                onClick={() => { setThemeMode(THEME_MODES.SOFT); setShowThemeMenu(false); toast.success('Soft Slate tone activated (Eye-comfort)'); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                                    themeMode === THEME_MODES.SOFT
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <span className="flex items-center gap-2">☁️ Soft Slate (Eye-comfort)</span>
                                {themeMode === THEME_MODES.SOFT && <Check size={14} className="text-blue-600" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setThemeMode(THEME_MODES.PURE); setShowThemeMenu(false); toast.success('Pure White tone activated'); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                                    themeMode === THEME_MODES.PURE
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <span className="flex items-center gap-2">⚪ Crisp White</span>
                                {themeMode === THEME_MODES.PURE && <Check size={14} className="text-blue-600" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setThemeMode(THEME_MODES.DARK); setShowThemeMenu(false); toast.success('Classic Dark tone activated'); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                                    themeMode === THEME_MODES.DARK
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <span className="flex items-center gap-2">🌑 Classic Navy Dark</span>
                                {themeMode === THEME_MODES.DARK && <Check size={14} className="text-blue-600" />}
                            </button>
                        </div>
                    )}
                </div>

                <NotificationDropdown />

                {/* Avatar + role — hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <button onClick={() => navigate('/profile')}>
                            <UserIcon className="w-4 h-4 text-primary-600" />
                        </button>
                    </div>
                    <div className="text-sm hidden md:block">
                        <p className="font-medium text-gray-900 leading-tight">
                            {user?.fullName === 'New Admin' ? 'Admin Panel' : (user?.fullName === 'Admin User' ? roleLabel : user?.fullName)}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">{roleLabel}</p>
                    </div>
                </div>

                {/* Mobile: icon-only avatar button */}
                <button
                    onClick={() => navigate('/profile')}
                    className="sm:hidden w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0"
                    aria-label="My profile"
                >
                    <UserIcon className="w-4 h-4 text-primary-600" />
                </button>

                {/* Logout — text on sm+, icon-only on mobile */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200/80 shadow-xs min-h-[36px]"
                    title="Log out of system"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
}