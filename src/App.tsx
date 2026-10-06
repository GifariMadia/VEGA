import { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ApiHeader } from './components/layout/ApiHeader';
import { ApiLoginView } from './components/auth/ApiLoginView';
import { ApiCoaView } from './components/coa/ApiCoaView';
import { ApiUploadView } from './components/upload/ApiUploadView';
import { ApiHistoryView } from './components/audit/ApiHistoryView';
import { ApiDashboardView } from './components/dashboard/ApiDashboardView';
import { ApiMatrixView } from './components/matrix/ApiMatrixView';
import { ApiUsersView } from './components/users/ApiUsersView';
import { ApiError, api, type UploadBatch, type UserProfile } from './lib/api';
import type { Language } from './types';

type Page = 'dashboard' | 'upload' | 'audit' | 'coa' | 'users' | 'matrix';

function AuthenticatedApp({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [coaCount, setCoaCount] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('vega.language') === 'EN' ? 'EN' : 'ID');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refreshBatches = async () => {
    try {
      const items: UploadBatch[] = [];
      for (let batchPage = 1; ; batchPage++) {
        const response = await api.request<{ items: UploadBatch[] }>(`/uploads/batches?page=${batchPage}&page_size=100`);
        items.push(...response.data.items);
        if (response.data.items.length < 100) break;
      }
      setBatches(items);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Gagal memuat riwayat.');
    }
  };

  useEffect(() => { void refreshBatches(); }, []);
  useEffect(() => {
    api.request<{ total: number }>('/coa?page_size=1').then((result) => setCoaCount(result.data.total)).catch((error) => setLoadError(error instanceof ApiError ? error.message : 'Gagal memuat jumlah COA.'));
  }, []);
  useEffect(() => { localStorage.setItem('vega.language', language); }, [language]);
  useEffect(() => {
    if (user.role !== 'ADMIN' && (page === 'users' || page === 'upload')) setPage('dashboard');
  }, [user.role, page]);

  return (
    <div className="flex min-h-screen bg-[#F5F7FA] font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      <Sidebar activeView={page} collapsed={sidebarCollapsed} currentUser={user} language={language} setActiveView={setPage} setCollapsed={setSidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <ApiHeader activeView={page} currentUser={user} language={language} onLogout={onLogout} setLanguage={setLanguage} />
        <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {loadError && <p aria-live="polite" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</p>}
          {page === 'dashboard' && <ApiDashboardView batches={batches} isAdmin={user.role === 'ADMIN'} language={language} onNavigate={setPage} refreshKey={batches.map((batch) => `${batch.id}:${batch.status}`).join('|')} />}
          {page === 'matrix' && <ApiMatrixView batches={batches} language={language} />}
          {page === 'coa' && <ApiCoaView isAdmin={user.role === 'ADMIN'} />}
          {page === 'upload' && user.role === 'ADMIN' && <ApiUploadView isAdmin onSaved={refreshBatches} />}
          {page === 'audit' && <ApiHistoryView isAdmin={user.role === 'ADMIN'} refreshKey={batches.map((batch) => `${batch.id}:${batch.status}`).join('|')} onChanged={refreshBatches} />}
          {page === 'users' && user.role === 'ADMIN' && <ApiUsersView currentUser={user} language={language} />}
        </main>
      </div>
    </div>
  );
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
