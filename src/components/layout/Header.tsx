import React, { useState, useRef, useEffect } from 'react';
import { 
  Languages, 
  Shield, 
  LogOut, 
  UserCheck, 
  ChevronDown, 
  Database,
  User,
  Check
} from 'lucide-react';
import { ActiveView, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  activeView?: ActiveView;
  activeTab?: ActiveView;
  onOpenRlsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, activeTab, onOpenRlsModal }) => {
  const currentView = activeView || activeTab || 'dashboard';
  const { 
    currentUser, 
    language, 
    setLanguage, 
    t, 
    switchRole, 
    logout 
  } = useAuth();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const roleRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(target)) {
        setRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Dynamic titles with guaranteed fallback
  const getPageMeta = () => {
    switch (currentView) {
      case 'dashboard':
        return {
          title: t.navDashboard,
          subtitle: language === 'ID'
            ? 'Ringkasan Varians Beban Operasional & Modal TI'
            : 'IT Operating & Capital Expenditure Variance Overview'
        };
      case 'matrix':
        return {
          title: t.matrixTitle,
          subtitle: t.matrixSubtitle
        };
      case 'upload':
        return {
          title: t.uploadTitle,
          subtitle: t.uploadSubtitle
        };
      case 'audit':
        return {
          title: t.auditTitle,
          subtitle: t.auditSubtitle
        };
      case 'coa':
        return {
          title: t.coaTitle,
          subtitle: t.coaSubtitle
        };
      case 'users':
        return {
          title: t.userMgmtTitle,
          subtitle: t.userMgmtSubtitle
        };
      default:
        return {
          title: t.navDashboard,
          subtitle: language === 'ID'
            ? 'Ringkasan Varians Beban Operasional & Modal TI'
            : 'IT Operating & Capital Expenditure Variance Overview'
        };
    }
  };

  const { title, subtitle } = getPageMeta();

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'Administrator':
        return 'bg-blue-50 text-[#1E5EFF] border-blue-200';
      case 'Viewer':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <header className="h-18 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
      {/* Page Title & Subtitle */}
      <div className="min-w-0 pr-4">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-500 truncate hidden sm:block">
          {subtitle}
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Supabase Schema / RLS trigger */}
        <button
          id="supabase-rls-btn"
          onClick={onOpenRlsModal}
          title={language === 'ID' ? 'Periksa kebijakan Supabase RLS dan skema PostgreSQL' : 'Inspect Supabase RLS policies and PostgreSQL schema'}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer shadow-2xs"
        >
          <Database className="w-3.5 h-3.5 text-[#1E5EFF]" />
          <span>{t.rlsSchema}</span>
        </button>

        {/* ID / EN Language Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-bold">
          <button
            id="lang-toggle-en"
            onClick={() => setLanguage('EN')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              language === 'EN'
                ? 'bg-white text-[#1E5EFF] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            id="lang-toggle-id"
            onClick={() => setLanguage('ID')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              language === 'ID'
                ? 'bg-white text-[#1E5EFF] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ID
          </button>
        </div>

        {/* Role Switcher & Role Badge */}
        <div className="relative" ref={roleRef}>
          <button
            id="role-switcher-btn"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold tracking-wide transition cursor-pointer shadow-2xs ${getRoleBadgeStyle(
              currentUser?.role
            )}`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{currentUser?.role || 'Guest'}</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {/* Quick Role Switcher Menu */}
          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                {t.switchRole}
              </div>
              {(['Administrator', 'Viewer'] as UserRole[]).map((r) => {
                const isCurrent = currentUser?.role === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-50 text-[#1E5EFF]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>{r}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {r === 'Administrator'
                          ? language === 'ID' ? 'Akses Penuh CRUD & Pengguna' : 'Full CRUD, Upload & Users'
                          : language === 'ID' ? 'Akses Baca Tampilan Eksekutif' : 'Read-only Executive View'}
                      </span>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-[#1E5EFF]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile & Sign Out */}
        <div className="relative" ref={profileRef}>
          <button
            id="profile-dropdown-btn"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.fullName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser?.fullName.charAt(0) || 'U'
              )}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden lg:inline-block max-w-[120px] truncate">
              {currentUser?.fullName.split(' ')[0]}
            </span>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.fullName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.email}
                </p>
                <div className="mt-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium inline-block">
                  Dept: {currentUser?.department}
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
