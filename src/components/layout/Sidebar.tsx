import React from 'react';
import { 
  LayoutDashboard,
  Table2, 
  UploadCloud, 
  History, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Server,
  Users
} from 'lucide-react';
import type { UserProfile } from '../../lib/api';

type ActiveView = 'dashboard' | 'upload' | 'audit' | 'coa' | 'users' | 'matrix';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentUser: UserProfile;
  language: 'ID' | 'EN';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  currentUser,
  language
}) => {
  const currentView = activeView;
  const isAdmin = currentUser.role === 'ADMIN';
  const labels = language === 'ID'
    ? { dashboard: 'Dasbor', upload: 'Unggah', audit: 'Riwayat Unggahan', coa: 'Daftar COA', users: 'Manajemen User', adminOnly: 'Admin', collapse: 'Ciutkan sidebar', expand: 'Perluas sidebar' }
    : { dashboard: 'Dashboard', upload: 'Upload', audit: 'Upload History', coa: 'COA List', users: 'User Management', adminOnly: 'Admin', collapse: 'Collapse Sidebar', expand: 'Expand Sidebar' };

  const navItems = [
    { id: 'matrix' as ActiveView, label: language === 'ID' ? 'Matriks Bulanan' : 'Monthly Matrix', icon: Table2, adminOnly: false },
    {
      id: 'dashboard' as ActiveView,
      label: labels.dashboard,
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      id: 'upload' as ActiveView,
      label: labels.upload,
      icon: UploadCloud,
      adminOnly: true,
      badge: labels.adminOnly
    },
    {
      id: 'audit' as ActiveView,
      label: labels.audit,
      icon: History,
      adminOnly: false,
    },
    {
      id: 'coa' as ActiveView,
      label: labels.coa,
      icon: Layers,
      adminOnly: false,
    },
    {
      id: 'users' as ActiveView,
      label: labels.users,
      icon: Users,
      adminOnly: true,
    },
  ];

  return (
    <aside 
      className={`bg-white border-r border-slate-200/80 transition-all duration-300 flex flex-col z-30 shrink-0 select-none shadow-xs ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-18 px-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#1E5EFF] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 font-black text-xl tracking-wider">
            V
          </div>
          {!collapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                  VEGA
                </span>
                <span className="text-[10px] font-bold bg-blue-50 text-[#1E5EFF] px-1.5 py-0.5 rounded border border-blue-100">
                  IT-OPS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {language === 'ID' ? 'Varians & Analitik TI' : 'Variance & Analytics'}
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          id="collapse-sidebar-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? labels.expand : labels.collapse}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition shrink-0 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isRestricted = item.adminOnly && !isAdmin;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => {
                if (!isRestricted) {
                  setActiveView(item.id);
                }
              }}
              disabled={isRestricted}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-[#1E5EFF] text-white shadow-md shadow-blue-600/25'
                  : isRestricted
                  ? 'text-slate-300 hover:bg-slate-50 cursor-not-allowed opacity-60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon 
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : isRestricted ? 'text-slate-300' : 'text-slate-500'
                }`} 
              />
              
              {!collapsed && (
                <span className="truncate flex-1 text-left">
                  {item.label}
                </span>
              )}

              {/* Admin badge */}
              {!collapsed && item.adminOnly && (
                <span 
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                    isActive 
                      ? 'bg-blue-800 text-blue-100' 
                      : isRestricted
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}
                >
                  Admin
                </span>
              )}

              {/* Collapsed active indicator */}
              {collapsed && isActive && (
                <span className="absolute right-1 w-1.5 h-6 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Role notice footer */}
      {!collapsed && (
        <div className="p-3 m-3 bg-[#F5F7FA] rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#1E5EFF]" />
            <span className="text-[11px] font-bold text-slate-700">
              {language === 'ID' ? 'Lingkungan Aktif' : 'Active Environment'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            {language === 'ID' ? 'Anggaran TI TA 2026/2027' : 'IT Budget FY2026/2027'}
          </p>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">
              {language === 'ID' ? 'Peran Saat Ini:' : 'Current Role:'}
            </span>
            <span className={`font-bold ${isAdmin ? 'text-blue-600' : 'text-slate-600'}`}>
                  {currentUser.role === 'ADMIN' ? 'Administrator' : 'Viewer'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
