import { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ApiLoginView } from './components/auth/ApiLoginView';
import { ServerUiProvider } from './context/ServerUiProvider';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { MonthlyMatrixView } from './components/matrix/MonthlyMatrixView';
import { UploadView } from './components/upload/UploadView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { CoaListView } from './components/coa/CoaListView';
import { UserManagementView } from './components/users/UserManagementView';
import { ApiError, api, type UserProfile } from './lib/api';
import type { Language } from './types';

type Page = 'dashboard' | 'upload' | 'audit' | 'coa' | 'users' | 'matrix';

function AuthenticatedApp({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('vega.language') === 'EN' ? 'EN' : 'ID');
  useEffect(() => { localStorage.setItem('vega.language', language); }, [language]);
  return <ServerUiProvider user={user} language={language} setLanguage={setLanguage} onLogout={onLogout}><LegacyAppLayout /></ServerUiProvider>;
}

function LegacyAppLayout() {
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useAuth();
  const { isApiLoading } = useData();
  useEffect(() => { if (!isAdmin && (page === 'upload' || page === 'users')) setPage('dashboard'); }, [isAdmin, page]);
  return <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
    <Sidebar activeView={page} setActiveView={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
    <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
      <Header activeView={page} onOpenRlsModal={() => {}} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {isApiLoading && <p role="status" className="mb-4 text-xs text-slate-500">Memuat data unggahan...</p>}
        {page === 'dashboard' && !isApiLoading && <DashboardView />}
        {page === 'matrix' && !isApiLoading && <MonthlyMatrixView />}
        {page === 'upload' && isAdmin && <UploadView onNavigateToDashboard={() => setPage('dashboard')} onNavigateToMatrix={() => setPage('matrix')} onNavigateToAudit={() => setPage('audit')} />}
        {page === 'audit' && <AuditTrailView />}
        {page === 'coa' && <CoaListView />}
        {page === 'users' && isAdmin && <UserManagementView />}
      </main>
    </div>

  </div>;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('vega.language') === 'EN' ? 'EN' : 'ID');

  useEffect(() => {
    if (!api.getToken()) { setChecking(false); return; }
    api.me().then(setUser).catch(() => api.setToken(null)).finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const expireSession = () => setUser(null);
    window.addEventListener('vega:session-expired', expireSession);
    return () => window.removeEventListener('vega:session-expired', expireSession);
  }, []);
  useEffect(() => { localStorage.setItem('vega.language', language); }, [language]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    const refreshSession = () => {
      if (!api.getToken()) { setUser(null); return; }
      api.me().then(profile => { if (live) setUser(profile); }).catch(error => {
        if (live && error instanceof ApiError && error.status === 401) setUser(null);
      });
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshSession(); };
    const timer = window.setInterval(refreshSession, 30000);
    window.addEventListener('focus', refreshSession);
    window.addEventListener('storage', refreshSession);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener('focus', refreshSession);
      window.removeEventListener('storage', refreshSession);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);

  const logout = async () => {
    try { await api.logout(); } catch { api.setToken(null); }
    setUser(null);
  };

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#F5F7FA] text-sm text-slate-500">Memeriksa sesi...</main>;
  return user ? <AuthenticatedApp onLogout={() => void logout()} user={user} /> : <ApiLoginView language={language} onSignedIn={setUser} setLanguage={setLanguage} />;
}
