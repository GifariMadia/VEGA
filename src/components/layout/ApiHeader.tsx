import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Shield, UserRound, KeyRound } from 'lucide-react';
import { api, ApiError, type UserProfile } from '../../lib/api';
import type { Language } from '../../types';
import { translations } from '../../lib/translations';

type Page = 'dashboard' | 'coa' | 'upload' | 'audit' | 'users' | 'matrix';

interface ApiHeaderProps {
  activeView: Page;
  currentUser: UserProfile;
  language: Language;
  setLanguage: (language: Language) => void;
  onLogout: () => void;
}

export function ApiHeader({ activeView, currentUser, language, setLanguage, onLogout }: ApiHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const t = translations[language];
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError(language === 'ID' ? 'Konfirmasi password tidak sama.' : 'Password confirmation does not match.');
      return;
    }
    setSavingPassword(true);
    setPasswordError('');
    try {
      await api.request('/auth/me/password', { method: 'PUT', body: JSON.stringify({ old_password: passwordForm.old, new_password: passwordForm.next }) });
      api.setToken(null);
      window.dispatchEvent(new Event('vega:session-expired'));
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : 'Password change failed.');
    } finally { setSavingPassword(false); }
  };
  const pageMeta = {
    matrix: { title: language === 'ID' ? 'Matriks Bulanan' : 'Monthly Matrix', subtitle: 'Budget / Actual - Apr-Mar' },
    dashboard: { title: t.navDashboard, subtitle: language === 'ID' ? 'Status data dan kesiapan operasional VEGA' : 'VEGA data and operational readiness' },
    coa: { title: t.coaTitle, subtitle: t.coaSubtitle },
    upload: { title: t.uploadTitle, subtitle: t.uploadSubtitle },
    audit: { title: t.auditTitle, subtitle: t.auditSubtitle },
    users: { title: language === 'ID' ? 'Manajemen User' : 'User Management', subtitle: language === 'ID' ? 'Akun, role Administrator dan Viewer' : 'Accounts and Administrator / Viewer roles' },
  }[activeView];

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white px-4 shadow-sm sm:px-6">
      <div className="min-w-0 pr-3">
        <h1 className="truncate text-xl font-extrabold text-slate-900">{pageMeta.title}</h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block">{pageMeta.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
          {(['ID', 'EN'] as Language[]).map((item) => <button aria-pressed={language === item} className={`rounded-md px-2 py-1 ${language === item ? 'bg-white text-[#1E5EFF] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`} key={item} onClick={() => setLanguage(item)}>{item}</button>)}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className={`grid size-9 place-items-center rounded-xl border text-xs font-bold ${currentUser.role === 'ADMIN' ? 'border-blue-200 bg-blue-50 text-[#1E5EFF]' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{currentUser.role === 'ADMIN' ? 'IT' : 'U'}</span>
          <span className="max-w-36">
            <span className="block truncate text-xs font-bold text-slate-800">{currentUser.full_name}</span>
            <span className="block text-[10px] text-slate-400">{currentUser.role === 'ADMIN' ? 'Administrator' : 'Viewer'}</span>
          </span>
        </div>
        <div className="relative" ref={profileRef}>
          <button aria-label={language === 'ID' ? 'Menu akun' : 'Account menu'} aria-expanded={profileOpen} className="grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => setProfileOpen((open) => !open)}>
            <UserRound size={18} />
            <ChevronDown className="absolute ml-7 mt-6 bg-white" size={12} />
          </button>
          {profileOpen && <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="border-b border-slate-100 p-3">
              <p className="truncate text-xs font-bold text-slate-900">{currentUser.full_name}</p>
              <p className="truncate text-[11px] text-slate-500">{currentUser.username}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><Shield size={11} />{currentUser.role === 'ADMIN' ? 'Administrator' : 'Viewer'}</span>
            </div>
            <button className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { setProfileOpen(false); setPasswordOpen(true); setPasswordError(''); setPasswordForm({ old: '', next: '', confirm: '' }); }}><KeyRound size={15} />{language === 'ID' ? 'Ubah kata sandi' : 'Change password'}</button>
            <button className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={() => { setProfileOpen(false); onLogout(); }}><LogOut size={15} />{t.logout}</button>
          </div>}
        </div>
      </div>
      {passwordOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl" onSubmit={changePassword}>
          <h2 id="password-title" className="font-bold">{language === 'ID' ? 'Ubah kata sandi' : 'Change password'}</h2>
          <p className="text-xs text-slate-500">{language === 'ID' ? 'Gunakan 12-72 byte, huruf besar/kecil, angka dan simbol. Setelah berhasil, masuk kembali.' : 'Use 12-72 bytes, uppercase/lowercase, digit and symbol. Sign in again after saving.'}</p>
          {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
          {(['old', 'next', 'confirm'] as const).map((field, index) => <label className="block text-xs font-semibold text-slate-600" key={field}>{(language === 'ID' ? ['Kata sandi lama', 'Kata sandi baru', 'Konfirmasi kata sandi'] : ['Current password', 'New password', 'Confirm password'])[index]}<input className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" type="password" autoComplete={field === 'old' ? 'current-password' : 'new-password'} required minLength={field === 'old' ? 1 : 12} maxLength={field === 'old' ? 200 : 72} value={passwordForm[field]} onChange={event => setPasswordForm({ ...passwordForm, [field]: event.target.value })} /></label>)}
          <div className="flex justify-end gap-2"><button type="button" className="rounded-lg border px-4 py-2 text-sm" disabled={savingPassword} onClick={() => { setPasswordOpen(false); setPasswordForm({ old: '', next: '', confirm: '' }); }}>{language === 'ID' ? 'Batal' : 'Cancel'}</button><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={savingPassword}>{language === 'ID' ? 'Simpan kata sandi' : 'Save password'}</button></div>
        </form>
      </div>}
    </header>
  );
}
