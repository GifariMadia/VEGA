import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { ApiError, api, type UserProfile } from '../../lib/api';
import type { Language } from '../../types';

interface ApiLoginViewProps {
  onSignedIn: (user: UserProfile) => void;
  language: Language;
  setLanguage: (language: Language) => void;
}

export function ApiLoginView({ onSignedIn, language, setLanguage }: ApiLoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSignedIn(await api.login(username.trim(), password));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Login gagal. Coba kembali.');
    } finally {
      setBusy(false);
    }
  };

  const id = language === 'ID';
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FA] p-4 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#1E5EFF] text-base font-black text-white shadow-sm">V</span>
          <span className="text-lg font-extrabold tracking-tight">VEGA</span>
          <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1E5EFF]">IT-OPS</span>
        </div>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold shadow-sm">
          {(['ID', 'EN'] as Language[]).map((item) => <button aria-pressed={language === item} className={`rounded px-2 py-0.5 ${language === item ? 'bg-[#1E5EFF] text-white' : 'text-slate-500'}`} key={item} onClick={() => setLanguage(item)}>{item}</button>)}
        </div>
      </div>
      <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black tracking-tight">{id ? 'Masuk ke VEGA' : 'Sign in to VEGA'}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">{id ? 'Sistem Pelacakan Budget vs Actual' : 'Budget vs Actual Tracking System'}</p>
        </div>
        {error && <div aria-live="polite" className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium leading-relaxed text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />{error}</div>}
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-xs font-bold text-slate-700">{id ? 'Nama pengguna' : 'Username'}
            <span className="relative mt-1.5 block"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input autoComplete="username" autoFocus className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]" onChange={(event) => setUsername(event.target.value)} placeholder={id ? 'Nama pengguna' : 'Username'} required spellCheck={false} value={username} /></span>
          </label>
          <label className="block text-xs font-bold text-slate-700">{id ? 'Kata sandi' : 'Password'}
            <span className="relative mt-1.5 block"><Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input autoComplete="current-password" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-11 text-sm font-medium text-slate-800 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]" onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required type={showPassword ? 'text' : 'password'} value={password} /><button aria-label={showPassword ? (id ? 'Sembunyikan kata sandi' : 'Hide password') : (id ? 'Tampilkan kata sandi' : 'Show password')} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span>
          </label>
          <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E5EFF] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70" disabled={busy} type="submit">{busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>{id ? 'Masuk' : 'Sign In'}<ArrowRight className="size-4" /></>}</button>
        </form>
      </section>
      <div className="mt-6 flex items-center gap-1.5 text-center text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-500" /><span>{id ? 'Akses diperiksa oleh server VEGA' : 'Access verified by VEGA server'}</span></div>
    </main>
  );
}