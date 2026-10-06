import React, { useState } from 'react';
import { X, ShieldCheck, Database, Copy, Check, Lock } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA_AND_RLS } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RlsPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t, language } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA_AND_RLS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="rls-modal-card"
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                {t.rlsModalTitle}
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {t.rlsEnforcedBadge}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {t.rlsModalSubtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Matrix overview */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            {t.rlsRbacTitle}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {t.roleAdministrator}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600">{t.rlsAdminBadge}</span>
              </div>
              <p className="text-xs text-slate-600">
                {t.rlsAdminDesc}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {t.roleStaff}
                </span>
                <span className="text-[11px] font-semibold text-blue-600">{t.rlsStaffBadge}</span>
              </div>
              <p className="text-xs text-slate-600">
                {t.rlsStaffDesc}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {t.roleViewer}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">{t.rlsViewerBadge}</span>
              </div>
              <p className="text-xs text-slate-600">
                {t.rlsViewerDesc}
              </p>
            </div>
          </div>
        </div>

        {/* SQL Script View */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs bg-slate-950 text-slate-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              supabase_schema_rls.sql
            </span>
            <button
              id="copy-sql-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-xs font-sans font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t.rlsCopiedBtn : t.rlsCopyBtn}
            </button>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
            {SUPABASE_SQL_SCHEMA_AND_RLS}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            {t.rlsCloseBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
