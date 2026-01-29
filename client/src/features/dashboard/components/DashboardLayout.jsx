import { useAuth } from '@/context/AuthContext';
import { MENU_ITEMS } from '../config/menuConfig';
import { Link, useLocation, Outlet } from 'react-router-dom';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    // Filter menu items based on permissions
    const availableMenu = MENU_ITEMS.filter(item => {
        if (!item.requiredPermission) return true;
        return user?.permissions?.includes(item.requiredPermission) ||
            user?.permissions?.includes('SYSTEM_ADMIN');
    });

    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            {/* Fixed Narrow Sidebar */}
            <aside className="w-52 bg-[#0f172a] flex flex-col shrink-0">
                <div className="px-3 py-4 border-b border-white/10 shrink-0">
                    <h1 className="text-sm font-black text-white uppercase tracking-tighter">
                        ERP OPERATIONAL <span className="text-blue-400">v2</span>
                    </h1>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5">
                    {availableMenu.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-none ${location.pathname === item.path
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={14} className={location.pathname === item.path ? 'text-white' : 'text-slate-500'} />
                            <span className="text-[12px] truncate">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-2 border-t border-white/10 shrink-0">
                    <button
                        onClick={logout}
                        className="flex items-center space-x-2 text-slate-400 hover:text-red-400 w-full px-3 py-1.5 rounded text-[12px] font-bold"
                    >
                        <span>Exit Session</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-slate-200 h-10 px-3 flex justify-between items-center shrink-0">
                    <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">
                        {availableMenu.find(m => m.path === location.pathname)?.label || 'Overview'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <span className="text-[11px] text-slate-500 font-bold uppercase mr-2">Operator:</span>
                            <span className="text-[12px] font-black text-slate-800">{user?.username}</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-3">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
