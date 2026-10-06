import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Database,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface LoginViewProps {
  onOpenRlsModal: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenRlsModal }) => {
  const { login, t, language, setLanguage } = useAuth();

  // Inputs start empty so shared app link requires manual typing
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await login(emailOrUsername, password);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || t.loginError);
    }
  };

  const handleQuickFill = (role: UserRole) => {
    setErrorMessage(null);
    if (role === 'Administrator') {
      setEmailOrUsername('admin@it-ops.vega.corp');
      setPassword('admin123');
    } else {
      setEmailOrUsername('viewer@it-ops.vega.corp');
      setPassword('viewer123');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4 selection:bg-blue-100 selection:text-blue-900">
      {/* Top bar with language switcher */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1E5EFF] text-white flex items-center justify-center font-black text-base shadow-sm">
            V
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">
            VEGA
          </span>
          <span className="text-[10px] font-bold bg-blue-50 text-[#1E5EFF] px-1.5 py-0.5 rounded border border-blue-100">
            IT-OPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRlsModal}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white shadow-2xs transition"
          >
            <Database className="w-3.5 h-3.5 text-[#1E5EFF]" />
            <span className="hidden sm:inline">Supabase</span> RLS
          </button>

          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setLanguage('EN')}
              className={`px-2 py-0.5 rounded transition ${language === 'EN' ? 'bg-[#1E5EFF] text-white' : 'text-slate-500'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ID')}
              className={`px-2 py-0.5 rounded transition ${language === 'ID' ? 'bg-[#1E5EFF] text-white' : 'text-slate-500'}`}
            >
              ID
            </button>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.loginHeading}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {t.loginSubheading}
          </p>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 font-medium leading-relaxed">
              {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.labelEmail}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email-input"
                type="text"
                required
                autoComplete="username"
                spellCheck={false}
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder={t.placeholderEmail}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] focus:border-transparent transition font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.labelPassword}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.placeholderPassword}
                className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] focus:border-transparent transition font-medium text-slate-800"
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#1E5EFF] hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{t.btnSignIn}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts Selection */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            {t.quickDemoAccounts}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="quick-demo-admin-btn"
              onClick={() => handleQuickFill('Administrator')}
              className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer flex flex-col items-center text-center shadow-xs"
            >
              <span className="text-sm font-extrabold">{t.roleAdministrator}</span>
              <span className="text-[10px] text-blue-600 font-medium mt-0.5">
                {language === 'ID' ? 'Akses Penuh • Unggah & Pengguna' : 'Full Access • Upload & Users'}
              </span>
            </button>
            <button
              type="button"
              id="quick-demo-viewer-btn"
              onClick={() => handleQuickFill('Viewer')}
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer flex flex-col items-center text-center shadow-xs"
            >
              <span className="text-sm font-extrabold">{t.roleViewer}</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                {language === 'ID' ? 'Hanya Baca • Dasbor Eksekutif' : 'Read-Only • Executive Dashboards'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Security note footer */}
      <div className="mt-6 text-center text-xs text-slate-400 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>
          {language === 'ID' 
            ? 'Diamankan dengan Autentikasi Supabase & Kebijakan Row Level Security (RLS)' 
            : 'Secured by Supabase Auth with Row Level Security Policies'}
        </span>
      </div>
    </div>
  );
};
