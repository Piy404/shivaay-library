import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { LogOut, Users, LayoutDashboard, ShieldCheck } from 'lucide-react';

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Shivaay Admin</h2>
        </div>
        <nav className="p-4 space-y-2 flex-1 flex flex-col">
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link to="/admin/students" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
            <Users size={20} />
            Students
          </Link>
          <Link to="/admin/security" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
            <ShieldCheck size={20} />
            Security &amp; Settings
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors mt-auto">
            <LogOut size={20} />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
