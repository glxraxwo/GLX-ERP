import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, BarChart3, Package, ShoppingCart, Users, Settings, Navigation, Briefcase,
    FolderTree, Award, UserCircle, Tags, Warehouse, Boxes, Truck,
    ShoppingBag, FileText, Receipt, Wallet, Workflow, Factory, ShieldCheck,
    RotateCcw, Wrench, AlertTriangle, FileMinus, X, Users as UsersIcon, Building2, Clock, Calendar as CalendarIcon, Plane, Calculator, DollarSign, Upload,
    ClipboardList, UserPlus, Ship, Layers, History, FileSpreadsheet,
    ChevronDown, ChevronRight, CheckSquare, ClipboardCheck, BadgeCheck,
    PackageCheck, CreditCard, Tag, Mail, Sparkles, Home, Search, Scale,
    Plus, ArrowLeftRight, Sliders, LineChart, PieChart, TrendingUp, UserCheck,
    MapPin, Download, Barcode, LogOut, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';
import { authApi } from '../../features/auth/authApi';
import { usePermission } from '../../hooks/usePermission';
import { useSettings } from '../../features/settings/useSettings';
import logo from '../../assets/logo.jpg';

// ── Regular grouped menu structure ─────────────────────────────────────────
const menuGroups = [
    {
        label: 'Dashboard',
        icon: LayoutDashboard,
        singleLink: true,
        path: '/dashboard',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard.view' },
        ],
    },
    {
        label: 'INVENTORY & STOCK',
        icon: Boxes,
        items: [
            { label: 'Products', icon: Package, path: '/products' },
            { label: 'Barcode Generator', icon: Barcode, path: '/barcode-generator' },
            { label: 'Categories', icon: FolderTree, path: '/categories' },
            { label: 'Brands', icon: Award, path: '/brands' },
            { label: 'Stock Overview', icon: Boxes, path: '/stock' },
        ],
    },
    {
        label: 'PROCUREMENT & SUPPLY',
        icon: ShoppingBag,
        items: [
            { label: 'Suppliers', icon: Truck, path: '/suppliers', permission: 'suppliers.view' },
            { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders', permission: 'purchasing.view' },
            { label: 'GRN', icon: PackageCheck, path: '/grns', permission: 'grn.manage' },
            { label: 'Supplier Bills', icon: Receipt, path: '/bills', permission: 'bills.view' },
        ],
    },
    {
        label: 'FINANCE',
        icon: DollarSign,
        items: [
            { label: 'Customer Invoices', icon: Receipt, path: '/invoices', permission: 'invoices.view' },
            { label: 'Receipts & Vouchers', icon: Wallet, path: '/payments', permission: 'payments.view' },
            { label: 'Income & Expenses', icon: Wallet, path: '/finance/expenses', permission: 'payments.view' },
            { label: 'Export Centre', icon: Download, path: '/export-centre', permission: 'dashboard.view' },
        ],
    },
    {
        label: 'SALES & CRM',
        icon: ShoppingCart,
        items: [
            { label: 'Customers', icon: UserCircle, path: '/customers', permission: 'customers.view' },
            { label: 'Quotations', icon: FileSpreadsheet, path: '/crm/quotations', permission: 'sales.view' },
            { label: 'Yard Projects', icon: Briefcase, path: '/crm/projects', permission: 'sales.view' },
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders', permission: 'sales.view' },
            { label: 'POS', icon: Calculator, path: '/pos', permission: 'pos.access' },
            { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns', permission: 'supplier_returns.view' },
            { label: 'Damages', icon: AlertTriangle, path: '/damages', permission: 'damages.view' },
        ],
    },

    {
        label: 'HUMAN RESOURCES',
        icon: UsersIcon,
        items: [
            { label: 'Employees Master', icon: UsersIcon, path: '/employees', permission: 'hr.employees.view' },
            { label: 'Attendance', icon: CalendarIcon, path: '/attendance', permission: 'hr.attendance.view' },
            { label: 'Leave Management', icon: Plane, path: '/leaves', permission: 'hr.leaves.view' },
            { label: 'Policy Management', icon: Clock, path: '/attendance-policies', permission: 'hr.attendance.view' },
            { label: 'Payroll', icon: DollarSign, path: '/payroll', permission: 'hr.payroll.view' },
            { label: 'Daily Wages (දිනපතා පඩි)', icon: CalendarIcon, path: '/hr/daily-payroll', permission: 'hr.payroll.view' },
            { label: 'EPF / ETF', icon: Calculator, path: '/hr/epf-etf', permission: 'hr.payroll.view' },
            { label: 'Salary Advance Approvals', icon: BadgeCheck, path: '/admin/advance-approvals', permission: 'hr.employees.manage', excludeRoles: ['employee'] },
            { label: 'Departments', icon: Building2, path: '/departments', permission: 'hr.employees.view' },
            { label: 'Designations', icon: Award, path: '/designations', permission: 'hr.employees.view' },
            { label: 'Shifts', icon: Clock, path: '/shifts', permission: 'hr.employees.view' },
            { label: 'Leave Structures', icon: CalendarIcon, path: '/leave-structures', permission: 'hr.leaves.view' },
            { label: 'Salary Structures', icon: Calculator, path: '/salary-structures', permission: 'hr.salary.view' },
        ],
    },
    {
        label: 'Reports',
        icon: BarChart3,
        singleLink: true,
        path: '/reports',
        items: [
            { label: 'Reports Hub', icon: BarChart3, path: '/reports', anyPermission: ['reports.sales', 'reports.financial', 'reports.inventory', 'reports.hr', 'reports.production'] },
        ],
    },
    {
        label: 'SYSTEM ADMIN',
        icon: Settings,
        adminOnly: true,
        items: [
            { label: 'Progress & Handoff (50-60%)', icon: Award, path: '/system-handoff', permission: 'admin.settings' },
            { label: 'Users', icon: Users, path: '/users', permission: 'admin.users.view' },
            { label: 'Roles & Permissions', icon: ShieldCheck, path: '/roles', permission: 'admin.roles.view' },
            { label: 'Data Import', icon: Upload, path: '/import', permission: 'admin.settings' },
            { label: 'Audit Logs', icon: History, path: '/audit-logs', permission: 'view_audit_logs' },
            { label: 'SMS Logs', icon: Mail, path: '/audit-logs/sms', permission: 'view_audit_logs' },
            { label: 'My Profile', icon: UserCheck, path: '/profile' },
            { label: 'Settings', icon: Settings, path: '/settings', permission: 'admin.settings' },
        ],
    },
];

// ── Approvals accordion structure ───────────────────────────────────────────
// Each category has an icon, label, and list of links with permissions.
const approvalCategories = [
    {
        id: 'inbound',
        label: 'Inbound Materials',
        icon: PackageCheck,
        description: 'GRN Quality & Quantity',
        items: [
            { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders', permission: 'purchasing.view' },
            { label: 'GRNs', icon: ClipboardCheck, path: '/bills', permission: 'bills.view' },
            { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns', permission: 'supplier_returns.view' },
        ],
    },
    {
        id: 'production',
        label: 'Production Batches',
        icon: Factory,
        description: 'QC & Lab Release',
        items: [
            { label: 'Production Orders', icon: Factory, path: '/production-orders', permission: 'production.view' },
            { label: 'Production Batches', icon: Layers, path: '/manufacturing/batches', permission: 'production.view' },
            { label: 'BOMs (Formulas)', icon: Workflow, path: '/boms', permission: 'bom.view' },
        ],
    },
    {
        id: 'expenses',
        label: 'Expense & Petty Cash',
        icon: DollarSign,
        description: 'Operational Cash Releases',
        items: [
            { label: 'Petty Cash', icon: DollarSign, path: '/finance/petty-cash', permission: 'payments.view' },
            { label: 'Bills', icon: Receipt, path: '/bills', permission: 'bills.view' },
            { label: 'Payments', icon: Wallet, path: '/payments', permission: 'payments.view' },
        ],
    },
    {
        id: 'sales',
        label: 'Sales & Pricing',
        icon: Tag,
        description: 'Discount Override Approvals',
        items: [
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders', permission: 'sales.view' },
            { label: 'Quotations', icon: FileText, path: '/crm/quotations', permission: 'sales.view' },
            { label: 'Invoices', icon: FileText, path: '/invoices', permission: 'invoices.view' },
            { label: 'Credit Notes', icon: CreditCard, path: '/credit-notes', permission: 'credit_notes.view' },
        ],
    },
    {
        id: 'returns',
        label: 'Returns & After-Sales',
        icon: RotateCcw,
        description: 'RMA & Damage Review',
        items: [
            { label: 'Customer Returns (RMA)', icon: RotateCcw, path: '/returns', permission: 'returns.view' },
            { label: 'Repairs', icon: Wrench, path: '/repairs', permission: 'repairs.view' },
            { label: 'Damages', icon: AlertTriangle, path: '/damages', permission: 'damages.view' },
        ],
    },
];

// ── Helper: Check if any item in a category is on the active route ──────────
function useIsCategoryActive(items) {
    const location = useLocation();
    return items.some((item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
}

// ── Approval accordion sub-category component ────────────────────────────────
function ApprovalCategory({ category, hasPermission, hasAnyPermission, isAdmin, searchQuery, onNavClick, isNarrow }) {
    const visibleItems = category.items.filter((item) => {
        const isPermitted = isAdmin ||
            (!item.permission && !item.anyPermission) ||
            (item.permission && hasPermission(item.permission)) ||
            (item.anyPermission && hasAnyPermission(item.anyPermission));

        if (!isPermitted) return false;

        if (!searchQuery) return true;
        return item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
               category.label.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const isActive = useIsCategoryActive(visibleItems);
    const [isOpen, setIsOpen] = useState(isActive);

    // Auto-open if a child is currently active or if searching
    useEffect(() => {
        if (searchQuery) {
            setIsOpen(visibleItems.length > 0);
        } else {
            setIsOpen(isActive);
        }
    }, [searchQuery, isActive, visibleItems.length]);

    if (visibleItems.length === 0) return null;

    const Icon = category.icon;

    if (isNarrow) {
        // Narrow mode: Direct icon link to first item, NO sub-tabs
        const primaryPath = visibleItems[0]?.path || '/purchase-orders';
        return (
            <div className="mb-2 flex justify-center">
                <NavLink
                    to={primaryPath}
                    onClick={onNavClick}
                    title={category.label}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                            ? 'bg-[#000865] text-white shadow-md'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                    <Icon size={18} />
                </NavLink>
            </div>
        );
    }

    return (
        <div className="mb-1">
            {/* Category header button */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-colors ${
                    isActive
                        ? 'text-slate-900 bg-slate-100/80 font-extrabold'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
                <Icon size={15} className={`flex-shrink-0 ${isActive ? 'text-[#000865]' : 'text-slate-400'}`} />
                <div className="flex-1 text-left min-w-0">
                    <p className="truncate leading-tight">{category.label}</p>
                    <p className="text-[10px] text-slate-400 truncate leading-tight normal-case font-normal">{category.description}</p>
                </div>
                {isOpen
                    ? <ChevronDown size={13} className="flex-shrink-0 text-slate-400" />
                    : <ChevronRight size={13} className="flex-shrink-0 text-slate-400" />
                }
            </button>

            {/* Collapsible items */}
            <div
                style={{
                    maxHeight: isOpen ? `${visibleItems.length * 48}px` : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.22s ease',
                }}
            >
                <div className="ml-3.5 pl-3 border-l border-slate-200 mt-1 space-y-1">
                    {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                            <NavLink
                                key={`${item.label}-${item.path}`}
                                to={item.path}
                                onClick={onNavClick}
                                className={({ isActive: isLinkActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                                        isLinkActive
                                            ? 'bg-[#000865] text-white font-bold shadow-xs'
                                            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                    }`
                                }
                            >
                                {({ isActive: isLinkActive }) => (
                                    <>
                                        <ItemIcon size={16} className={`flex-shrink-0 ${isLinkActive ? 'text-white' : 'text-slate-500'}`} />
                                        <span className="truncate">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Regular menu group component ──────────────────────────────────────────────
function MenuGroup({ group, searchQuery, onNavClick, isNarrow, themeMode }) {
    const visibleItems = group.items;
    if (visibleItems.length === 0) return null;

    const isActive = useIsCategoryActive(visibleItems);
    const isDark = themeMode === THEME_MODES.DARK;
    const isSoft = themeMode === THEME_MODES.SOFT;

    const inactiveItemText = isDark
        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        : isSoft
            ? 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900';

    if (group.singleLink) {
        const targetPath = group.path || visibleItems[0]?.path || '/dashboard';
        const Icon = group.icon || visibleItems[0]?.icon;
        if (isNarrow) {
            return (
                <div className="mb-2 flex justify-center">
                    <NavLink
                        to={targetPath}
                        onClick={onNavClick}
                        title={group.label}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                            isActive
                                ? 'bg-[#000865] text-white shadow-md'
                                : isDark
                                    ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900'
                        }`}
                    >
                        {Icon && <Icon size={20} />}
                    </NavLink>
                </div>
            );
        }

        return (
            <div className="mb-1">
                <NavLink
                    to={targetPath}
                    onClick={onNavClick}
                    className={({ isActive: isLinkActive }) =>
                        `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isLinkActive
                                ? 'bg-[#000865] text-white font-bold shadow-xs'
                                : inactiveItemText
                        }`
                    }
                >
                    {({ isActive: isLinkActive }) => (
                        <>
                            {Icon && <Icon size={18} className={`flex-shrink-0 ${isLinkActive ? 'text-white' : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />}
                            <span className="flex-1 text-left truncate">{group.label}</span>
                        </>
                    )}
                </NavLink>
            </div>
        );
    }

    if (isNarrow) {
        // NARROW MODE
        return (
            <div className="mb-2 space-y-1 flex flex-col items-center">
                {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                        <NavLink
                            key={`${item.label}-${item.path}`}
                            to={item.path}
                            onClick={onNavClick}
                            title={item.label}
                            className={({ isActive: isLinkActive }) =>
                                `w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                                    isLinkActive
                                        ? 'bg-[#000865] text-white shadow-md'
                                        : isDark
                                            ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900'
                                }`
                            }
                        >
                            {ItemIcon && <ItemIcon size={18} />}
                        </NavLink>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="mb-3">
            {/* Category section title — always visible */}
            {group.label && (
                <div className={`px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider select-none ${
                    isDark ? 'text-slate-400' : isSoft ? 'text-slate-500' : 'text-slate-400'
                }`}>
                    {group.label}
                </div>
            )}

            {/* Sub items list — always visible, NOT hidden */}
            <div className="space-y-0.5">
                {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    if (item.isExternal || item.path.startsWith('http')) {
                        return (
                            <a
                                key={`${item.label}-${item.path}`}
                                href={item.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onNavClick}
                                className="flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <ItemIcon size={16} className="flex-shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </div>
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">Portal</span>
                            </a>
                        );
                    }
                    return (
                        <NavLink
                            key={`${item.label}-${item.path}`}
                            to={item.path}
                            onClick={onNavClick}
                            className={({ isActive: isLinkActive }) =>
                                `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    isLinkActive
                                        ? 'bg-[#000865] text-white font-bold shadow-xs'
                                        : inactiveItemText
                                }`
                            }
                        >
                            {({ isActive: isLinkActive }) => (
                                <>
                                    {ItemIcon && (
                                        <ItemIcon
                                            size={17}
                                            className={`flex-shrink-0 ${isLinkActive ? 'text-white' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}
                                        />
                                    )}
                                    <span className="truncate">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main Sidebar component ────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const sidebarRef = useRef(null);
    const { hasPermission, hasAnyPermission, isAdmin, user } = usePermission();
    const { themeMode, setThemeMode } = useThemeStore();
    const { logout } = useAuthStore();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const isDark = themeMode === THEME_MODES.DARK;
    const isSoft = themeMode === THEME_MODES.SOFT;

    const asideBgClass = {
        [THEME_MODES.SOFT]: 'bg-[#EEF2F6] border-r border-slate-300/80 text-slate-800 shadow-xs',
        [THEME_MODES.PURE]: 'bg-white border-r border-slate-200 text-slate-800 shadow-xs',
        [THEME_MODES.DARK]: 'bg-[#0B192C] border-r border-slate-900 text-slate-100 shadow-xl',
    }[themeMode] || 'bg-[#EEF2F6] border-r border-slate-300 text-slate-800';

    const brandBorder = isDark ? 'border-b border-slate-900' : (isSoft ? 'border-b border-slate-200' : 'border-b border-slate-100');
    const brandTitle = isDark ? 'text-white' : 'text-slate-900';
    const brandSub = isDark ? 'text-slate-400' : 'text-slate-500';

    const searchInputClass = isDark
        ? 'w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-100 placeholder-slate-500 transition-all'
        : (isSoft
            ? 'w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#000865]/20 focus:border-[#000865] font-medium text-slate-800 placeholder-slate-400 transition-all'
            : 'w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#000865]/20 focus:border-[#000865] font-medium text-slate-800 placeholder-slate-400 transition-all');

    const dateFilterClass = isDark
        ? 'space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800'
        : (isSoft
            ? 'space-y-2 bg-white/80 p-3 rounded-xl border border-slate-300/80'
            : 'space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200');

    const dateSelectClass = isDark
        ? 'px-2 py-1.5 border border-slate-800 rounded-lg text-[11px] focus:ring-2 focus:ring-sky-500 outline-none bg-slate-900 font-medium text-slate-200 cursor-pointer shadow-2xs'
        : (isSoft
            ? 'px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] focus:ring-2 focus:ring-[#000865]/20 outline-none bg-white font-medium text-slate-700 cursor-pointer shadow-2xs'
            : 'px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-[#000865]/20 outline-none bg-white font-medium text-slate-700 cursor-pointer shadow-2xs');

    const footerClass = isDark
        ? 'p-3 border-t border-slate-900 flex-shrink-0 space-y-2.5 bg-[#0B192C]'
        : (isSoft
            ? 'p-3 border-t border-slate-200 flex-shrink-0 space-y-2.5 bg-[#EEF2F6]'
            : 'p-3 border-t border-slate-100 flex-shrink-0 space-y-2.5 bg-white');

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

    const [searchQuery, setSearchQuery] = useState('');

    // Date Filter State
    const [dateFilterEnabled, setDateFilterEnabled] = useState(() => {
        return localStorage.getItem('dateFilterEnabled') === 'true';
    });
    const [filterMonth, setFilterMonth] = useState(() => {
        return localStorage.getItem('filterMonth') || String(new Date().getMonth() + 1);
    });
    const [filterYear, setFilterYear] = useState(() => {
        return localStorage.getItem('filterYear') || String(new Date().getFullYear());
    });

    const handleDateFilterToggle = (e) => {
        const enabled = e.target.checked;
        setDateFilterEnabled(enabled);
        localStorage.setItem('dateFilterEnabled', String(enabled));
        
        if (enabled) {
            if (!localStorage.getItem('filterMonth')) {
                localStorage.setItem('filterMonth', filterMonth);
            }
            if (!localStorage.getItem('filterYear')) {
                localStorage.setItem('filterYear', filterYear);
            }
        }
        
        window.location.reload();
    };

    const handleMonthChange = (e) => {
        const m = e.target.value;
        setFilterMonth(m);
        localStorage.setItem('filterMonth', m);
        window.location.reload();
    };

    const handleYearChange = (e) => {
        const y = e.target.value;
        setFilterYear(y);
        localStorage.setItem('filterYear', y);
        window.location.reload();
    };

    // Close on outside click (mobile)
    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
            if (window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                onClose();
            }
        };
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', handleOutsideClick);
        }, 100);
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose]);

    // Filter regular groups by permission and search query
    const visibleGroups = menuGroups
        .map((g) => {
            if (user?.role === 'employee' && g.label !== 'Overview' && g.label !== 'Dashboard') {
                return null;
            }

            const matchedItems = g.items.filter((item) => {
                if (item.excludeRoles && item.excludeRoles.includes(user?.role)) {
                    return false;
                }

                const isPermitted = isAdmin ||
                    (!item.permission && !item.anyPermission) ||
                    (item.permission && hasPermission(item.permission)) ||
                    (item.anyPermission && hasAnyPermission(item.anyPermission));

                if (!isPermitted) return false;

                if (!searchQuery) return true;
                return item.label.toLowerCase().includes(searchQuery.toLowerCase()) || (g.label && g.label.toLowerCase().includes(searchQuery.toLowerCase()));
            });

            return {
                ...g,
                items: matchedItems
            };
        })
        .filter((g) => g && g.items.length > 0);

    return (
        <>
            {/* Backdrop overlay (mobile <1024px) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar panel */}
            <aside
                ref={sidebarRef}
                className={`no-print fixed lg:static inset-y-0 left-0 h-screen ${asideBgClass} flex flex-col z-40 transition-all duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0 w-64 min-w-[256px]' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:min-w-[80px] w-0 min-w-0 overflow-hidden'
                }`}
            >
                <div className={`${isOpen ? 'w-64' : 'w-20'} flex flex-col h-full transition-all duration-300`}>

                    {/* ── Logo / Brand ── */}
                    <div className={`p-4 ${brandBorder} flex items-center ${isOpen ? 'justify-between' : 'justify-center'} flex-shrink-0`}>
                        <div className="flex items-center gap-3">
                            {settings?.companyLogo ? (
                                <img
                                    src={settings.companyLogo}
                                    className={`w-9 h-9 object-contain rounded-lg flex-shrink-0 border p-0.5 shadow-2xs ${
                                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-white'
                                    }`}
                                    alt="Logo"
                                />
                            ) : (
                                <img
                                    src={logo}
                                    className={`w-9 h-9 object-contain rounded-lg flex-shrink-0 border p-0.5 shadow-2xs ${
                                        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-white'
                                    }`}
                                    alt="Logo"
                                />
                            )}
                            {isOpen && (
                                <div>
                                    <h2 className={`font-extrabold ${brandTitle} leading-none truncate max-w-[145px]`} title={settings?.companyName || 'GLX Industries'}>
                                        {settings?.companyName || 'GLX Industries'}
                                    </h2>
                                    <p className={`text-[10px] ${brandSub} font-semibold mt-1 truncate max-w-[145px]`} title="TRUCK BODY ENGINEERS">
                                        TRUCK BODY ENGINEERS
                                    </p>
                                </div>
                            )}
                        </div>
                        {isOpen && (
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition lg:hidden"
                                aria-label="Close sidebar"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* ── Search and Date Filter Controls (Only when sidebar expanded) ── */}
                    {isOpen && (
                        <div className={`px-5 py-4 ${brandBorder} space-y-4 flex-shrink-0`}>
                            {/* Search Menu Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search menu..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={searchInputClass}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Date Filter */}
                            <div className={dateFilterClass}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date Filter</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={dateFilterEnabled}
                                            onChange={handleDateFilterToggle}
                                            className="sr-only peer"
                                        />
                                        <div className="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#000865]"></div>
                                    </label>
                                </div>

                                {dateFilterEnabled && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <select
                                            value={filterMonth}
                                            onChange={handleMonthChange}
                                            className={dateSelectClass}
                                        >
                                            <option value="1">January</option>
                                            <option value="2">February</option>
                                            <option value="3">March</option>
                                            <option value="4">April</option>
                                            <option value="5">May</option>
                                            <option value="6">June</option>
                                            <option value="7">July</option>
                                            <option value="8">August</option>
                                            <option value="9">September</option>
                                            <option value="10">October</option>
                                            <option value="11">November</option>
                                            <option value="12">December</option>
                                        </select>
                                        <select
                                            value={filterYear}
                                            onChange={handleYearChange}
                                            className={dateSelectClass}
                                        >
                                            <option value="2024">2024</option>
                                            <option value="2025">2025</option>
                                            <option value="2026">2026</option>
                                            <option value="2027">2027</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Scrollable nav ── */}
                    <nav className={`flex-1 overflow-y-auto no-scrollbar py-3 ${isOpen ? 'px-3 space-y-4' : 'px-2 space-y-2'}`}>

                        {/* ── Regular menu groups ── */}
                        {visibleGroups.map((group) => (
                            <MenuGroup
                                key={group.label}
                                group={group}
                                searchQuery={searchQuery}
                                isNarrow={!isOpen}
                                themeMode={themeMode}
                                onNavClick={() => { if (window.innerWidth < 1024) onClose(); }}
                            />
                        ))}

                        {/* ── Employee Self-Service Section ── */}
                        {user?.role === 'employee' && (
                            <div>
                                {isOpen && (
                                    <div className="flex items-center gap-2 px-3 mb-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                            My Services
                                        </p>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <NavLink
                                        to="/my-advances"
                                        title="My Salary Advances"
                                        onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                        className={({ isActive }) =>
                                            `flex items-center ${isOpen ? 'gap-2.5 px-3 py-2 rounded-xl text-xs' : 'justify-center w-11 h-11 mx-auto rounded-xl'} font-semibold transition-all duration-150 ${
                                                isActive
                                                    ? 'bg-[#000865] text-white font-bold rounded-xl shadow-xs'
                                                    : isDark
                                                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                                        : isSoft
                                                            ? 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                                                            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                            }`
                                        }
                                    >
                                        <Wallet size={16} className="flex-shrink-0" />
                                        {isOpen && <span className="truncate">My Salary Advances</span>}
                                    </NavLink>
                                    <NavLink
                                        to="/request-advance"
                                        title="Request Advance"
                                        onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                        className={({ isActive }) =>
                                            `flex items-center ${isOpen ? 'gap-2.5 px-3 py-2 rounded-xl text-xs' : 'justify-center w-11 h-11 mx-auto rounded-xl'} font-semibold transition-all duration-150 ${
                                                isActive
                                                    ? 'bg-[#000865] text-white font-bold rounded-xl shadow-xs'
                                                    : isDark
                                                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                                        : isSoft
                                                            ? 'text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                                                            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                            }`
                                        }
                                    >
                                        <BadgeCheck size={16} className="flex-shrink-0" />
                                        {isOpen && <span className="truncate">Request Advance</span>}
                                    </NavLink>
                                </div>
                            </div>
                        )}

                    </nav>

                    {/* ── Footer ── */}
                    <div className={footerClass}>
                        {user && (
                            <div className={`flex items-center ${isOpen ? 'gap-2.5' : 'justify-center'} min-w-0`}>
                                <div 
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs ${
                                        isDark
                                            ? 'bg-slate-800 text-sky-400 border-slate-700'
                                            : (isSoft ? 'bg-white text-[#000865] border-slate-300' : 'bg-slate-100 text-[#000865] border-slate-200')
                                    }`}
                                    title={`${user?.fullName || user?.firstName || 'User'} (${user?.role || 'Member'})`}
                                >
                                    {(user?.fullName || user?.firstName || 'U').charAt(0).toUpperCase()}
                                </div>
                                {isOpen && (
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                            {user?.fullName || user?.firstName || 'User'}
                                        </p>
                                        <p className={`text-[10px] truncate capitalize font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {user?.role?.replace('_', ' ') || 'Member'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tone / Theme Switcher in Sidebar */}
                        {isOpen && (
                            <div className={`p-1 rounded-xl flex items-center justify-between text-[11px] font-semibold border ${
                                isDark
                                    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                                    : (isSoft ? 'bg-slate-200/80 border-slate-300 text-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700')
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => { setThemeMode(THEME_MODES.SOFT); toast.success('Soft Slate tone (Eye-comfort)'); }}
                                    className={`flex-1 py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                                        themeMode === THEME_MODES.SOFT ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                                    }`}
                                    title="Soft Slate (Eye-comfort / Less glare)"
                                >
                                    <span>☁️ Soft</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setThemeMode(THEME_MODES.PURE); toast.success('Pure White tone'); }}
                                    className={`flex-1 py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                                        themeMode === THEME_MODES.PURE ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                                    }`}
                                    title="Pure White"
                                >
                                    <span>⚪ White</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setThemeMode(THEME_MODES.DARK); toast.success('Classic Dark tone'); }}
                                    className={`flex-1 py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition ${
                                        themeMode === THEME_MODES.DARK ? 'bg-slate-800 text-white shadow-xs font-bold' : 'hover:text-slate-900'
                                    }`}
                                    title="Navy Dark"
                                >
                                    <span>🌑 Dark</span>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            title="Logout"
                            className={`w-full flex items-center justify-center ${isOpen ? 'gap-2 px-3 py-2' : 'p-2'} bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs`}
                        >
                            <LogOut size={15} />
                            {isOpen && <span>Logout</span>}
                        </button>

                        {isOpen && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-medium">
                                <span>GLX ERP</span>
                                <span>v1.0.0 · MVP</span>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}