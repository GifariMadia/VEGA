import React, { useState, useMemo } from 'react';
import { 
  History, 
  FileSpreadsheet, 
  AlertOctagon, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  DollarSign,
  Layers
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyUSD } from '../../lib/calculations';
import { BudgetStatus, UploadType } from '../../types';

export const AuditTrailView: React.FC = () => {
  const { uploads } = useData();
  const { t, language } = useAuth();

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>('batch-gl-2026-08-v2');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Over' | 'Under' | 'On' | 'Replaced'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | UploadType>('All');

  const toggleExpand = (id: string) => {
    setExpandedBatchId(expandedBatchId === id ? null : id);
  };

  // Filtered batches
  const filteredUploads = useMemo(() => {
    return uploads.filter((batch) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchFile = batch.fileName.toLowerCase().includes(q);
        const matchUser = batch.uploadedBy.toLowerCase().includes(q);
        const matchPeriod = `${batch.fiscalYear} ${batch.targetMonth || ''}`.toLowerCase().includes(q);
        const matchId = batch.id.toLowerCase().includes(q);
        if (!matchFile && !matchUser && !matchPeriod && !matchId) return false;
      }

      if (typeFilter !== 'All' && batch.uploadType !== typeFilter) return false;

      if (statusFilter === 'Over' && !batch.isOverBudget && batch.budgetStatus !== 'Over Budget') return false;
      if (statusFilter === 'Under' && batch.budgetStatus !== 'Under Budget') return false;
      if (statusFilter === 'On' && batch.budgetStatus !== 'On Budget') return false;
      if (statusFilter === 'Replaced' && batch.status !== 'Replaced') return false;

      return true;
    });
  }, [uploads, searchQuery, statusFilter, typeFilter]);

  // Aggregate statistics for KPI Summary
  const stats = useMemo(() => {
    const totalBatches = uploads.length;
    const overBudgetBatches = uploads.filter(u => u.isOverBudget || u.budgetStatus === 'Over Budget');
    const underBudgetBatches = uploads.filter(u => u.budgetStatus === 'Under Budget');
    const onBudgetBatches = uploads.filter(u => u.budgetStatus === 'On Budget');
    const replacedBatches = uploads.filter(u => u.status === 'Replaced');

    const totalOverAmount = overBudgetBatches.reduce((acc, u) => acc + (u.overBudgetAmount || 0), 0);
    const totalIngestedVolume = uploads.reduce((acc, u) => acc + u.totalAmount, 0);

    return {
      totalBatches,
      overBudgetCount: overBudgetBatches.length,
      underBudgetCount: underBudgetBatches.length,
      onBudgetCount: onBudgetBatches.length,
      replacedCount: replacedBatches.length,
      totalOverAmount,
      totalIngestedVolume
    };
  }, [uploads]);

  const getBudgetStatusBadge = (batch: typeof uploads[0]) => {
    const isOver = batch.isOverBudget || batch.budgetStatus === 'Over Budget';
    const isUnder = batch.budgetStatus === 'Under Budget';

    if (isOver) {
      const overAmt = batch.overBudgetAmount || Math.max(0, (batch.varianceAmount || 0));
      const overPct = batch.overBudgetPercentage || 0;
      return (
        <span 
          id={`budget-badge-over-${batch.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
          title={language === 'ID' 
            ? `Batch ini berstatus LEBIH ANGGARAN sebesar +${formatCurrencyUSD(overAmt)} (+${overPct.toFixed(2)}%)` 
            : `This batch is OVER BUDGET by +${formatCurrencyUSD(overAmt)} (+${overPct.toFixed(2)}%)`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
          <span>{language === 'ID' ? 'Lebih Anggaran:' : 'Over Budget:'} +{formatCurrencyUSD(overAmt, true)} (+{overPct.toFixed(1)}%)</span>
        </span>
      );
    }

    if (isUnder) {
      const diffAmt = Math.abs(batch.varianceAmount || 0);
      const diffPct = Math.abs(batch.overBudgetPercentage || 0);
      return (
        <span 
          id={`budget-badge-under-${batch.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
          title={language === 'ID' 
            ? `Batch ini berstatus DI BAWAH ANGGARAN (hemat ${formatCurrencyUSD(diffAmt)})` 
            : `This batch is UNDER BUDGET (saving of ${formatCurrencyUSD(diffAmt)})`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{language === 'ID' ? 'Hemat Anggaran:' : 'Under Budget:'} -{formatCurrencyUSD(diffAmt, true)} (-{diffPct.toFixed(1)}%)</span>
        </span>
      );
    }

    return (
      <span 
        id={`budget-badge-on-${batch.id}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-blue-50 text-[#1E5EFF] border border-blue-200"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5EFF] shrink-0" />
        <span>{language === 'ID' ? 'Sesuai Anggaran (Dalam Pagu)' : 'On Budget (Within Target)'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Header Card */}
      <div 
        id="audit-header-card"
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#1E5EFF]" />
            <span>{t.auditTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ID'
              ? 'Audit trail historis aktivitas upload anggaran & GL actuals, lengkap dengan status kondisi Over/Under Budget, nominal selisih, dan persentase deviasi.'
              : 'Historical audit trail of budget & GL actuals upload activities, complete with Over/Under Budget status conditions, variance amounts, and deviation percentages.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <span>{language === 'ID' ? 'Total Log:' : 'Total Log:'}</span>
            <span className="font-mono font-bold text-[#1E5EFF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {uploads.length} {language === 'ID' ? 'Batch Terunggah' : 'Ingested Batches'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Health & Over Budget Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div 
          id="kpi-total-batches-card"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1"
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'ID' ? 'Total Batch Terunggah' : 'Total Batches Ingested'}
          </span>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {stats.totalBatches} <span className="text-xs font-sans font-normal text-slate-500">{language === 'ID' ? 'File Terunggah' : 'Files Ingested'}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Vol: {formatCurrencyUSD(stats.totalIngestedVolume, true)}
          </p>
        </div>

        <div 
          id="kpi-overbudget-card"
          className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              {language === 'ID' ? 'Batch Over Budget' : 'Over Budget Batches'}
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="text-xl font-extrabold text-rose-700 font-mono">
            {stats.overBudgetCount} <span className="text-xs font-sans font-normal text-rose-600">{language === 'ID' ? 'Batch Melebihi Pagu' : 'Batches Exceeding Budget'}</span>
          </div>
          <p className="text-[11px] text-rose-700 font-bold font-mono">
            Total Over: +{formatCurrencyUSD(stats.totalOverAmount)}
          </p>
        </div>

        <div 
          id="kpi-within-budget-card"
          className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1"
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            {language === 'ID' ? 'Sesuai / Hemat Anggaran' : 'Under / On Budget'}
          </span>
          <div className="text-xl font-extrabold text-emerald-700 font-mono">
            {stats.underBudgetCount + stats.onBudgetCount} <span className="text-xs font-sans font-normal text-emerald-600">{language === 'ID' ? 'Batch Efisien' : 'Efficient Batches'}</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">
            {stats.underBudgetCount} {language === 'ID' ? 'Di Bawah Anggaran' : 'Under Budget'}, {stats.onBudgetCount} {language === 'ID' ? 'Sesuai Anggaran' : 'On Budget'}
          </p>
        </div>

        <div 
          id="kpi-replaced-card"
          className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1"
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            {language === 'ID' ? 'Ganti Data (Replaced)' : 'Superseded (Replaced)'}
          </span>
          <div className="text-xl font-extrabold text-amber-800 font-mono">
            {stats.replacedCount} <span className="text-xs font-sans font-normal text-amber-700">{language === 'ID' ? 'Tergantikan' : 'Superseded'}</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium">
            {language === 'ID' ? 'Tersimpan versi lama & revisi' : 'Stored historical & revised versions'}
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div 
        id="audit-filters-bar"
        className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="audit-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ID' ? 'Cari nama file batch, uploader, periode (mis: Aug), atau Batch ID...' : 'Search batch file name, uploader, period (e.g. Aug), or Batch ID...'}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>{language === 'ID' ? 'Kondisi:' : 'Condition:'}</span>
          </div>
          <select
            id="audit-condition-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-bold py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
          >
            <option value="All">{language === 'ID' ? 'Semua Kondisi' : 'All Conditions'}</option>
            <option value="Over">{language === 'ID' ? '🔴 Over Budget Saja' : '🔴 Over Budget Only'}</option>
            <option value="Under">{language === 'ID' ? '🟢 Under Budget Saja' : '🟢 Under Budget Only'}</option>
            <option value="On">{language === 'ID' ? '🔵 On Budget Saja' : '🔵 On Budget Only'}</option>
            <option value="Replaced">{language === 'ID' ? '🟠 Replaced (Ganti Data)' : '🟠 Replaced (Superseded)'}</option>
          </select>

          <select
            id="audit-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="text-xs font-bold py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
          >
            <option value="All">{language === 'ID' ? 'Semua Tipe Upload' : 'All Upload Types'}</option>
            <option value="Monthly GL">{language === 'ID' ? 'Realisasi Bulanan (Monthly GL)' : 'Monthly GL'}</option>
            <option value="Budget">{language === 'ID' ? 'Pagu Anggaran Tahunan' : 'Annual Budget'}</option>
          </select>
        </div>
      </div>

      {/* Ingested Batches List & Detailed Budget Status Rendering */}
      <div 
        id="audit-batches-list-container"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      >
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-bold text-slate-700">
            {language === 'ID' 
              ? `Daftar Aktivitas Upload & Rincian Status Anggaran (${filteredUploads.length} Batch)` 
              : `Upload Activity List & Budget Status Breakdown (${filteredUploads.length} Batches)`}
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.badgeActive}
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t.badgeReplaced}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredUploads.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {language === 'ID' 
                ? 'Tidak ada riwayat upload yang cocok dengan kata kunci atau filter status.' 
                : 'No upload history matches the search keywords or status filter.'}
            </div>
          ) : (
            filteredUploads.map((batch) => {
              const isReplaced = batch.status === 'Replaced';
              const isExpanded = expandedBatchId === batch.id;
              const isOver = batch.isOverBudget || batch.budgetStatus === 'Over Budget';
              
              // Find corresponding replacement batch if exists
              const replacementBatch = batch.replacedBatchId 
                ? uploads.find((u) => u.id === batch.replacedBatchId) 
                : null;

              const targetBudget = batch.targetBudgetAmount || (batch.uploadType === 'Budget' ? 43_000_000 : 3_450_000);
              const varianceVal = batch.varianceAmount !== undefined ? batch.varianceAmount : (batch.totalAmount - targetBudget);
              const variancePctVal = batch.overBudgetPercentage !== undefined ? batch.overBudgetPercentage : ((varianceVal / targetBudget) * 100);

              return (
                <div key={batch.id} className="transition">
                  {/* Main Row summary */}
                  <div 
                    id={`batch-row-${batch.id}`}
                    className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/90 transition ${
                      isReplaced ? 'bg-amber-50/15' : isOver ? 'hover:bg-rose-50/20' : 'bg-white'
                    }`}
                    onClick={() => toggleExpand(batch.id)}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isReplaced 
                          ? 'bg-amber-100 text-amber-700' 
                          : isOver 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-blue-50 text-[#1E5EFF]'
                      }`}>
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-slate-900 text-sm truncate max-w-[260px] sm:max-w-md">
                            {batch.fileName}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isReplaced 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isReplaced ? t.badgeReplaced : t.badgeActive}
                          </span>
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {batch.uploadType}
                          </span>
                        </div>

                        {/* Detailed Status Pill & Over Budget Metrics */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {getBudgetStatusBadge(batch)}

                          {batch.overBudgetAccountsCount && batch.overBudgetAccountsCount > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                              {batch.overBudgetAccountsCount} {language === 'ID' ? 'Akun Melebihi Pagu' : 'Accounts Exceeding Budget'}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2.5 flex-wrap font-medium">
                          <span>{language === 'ID' ? 'Periode:' : 'Period:'} <strong className="text-slate-700">{batch.fiscalYear} {batch.targetMonth ? `(${batch.targetMonth})` : ''}</strong></span>
                          <span>•</span>
                          <span>{language === 'ID' ? 'Diunggah oleh:' : 'Uploaded by:'} <strong className="text-slate-700">{batch.uploadedBy}</strong></span>
                          <span>•</span>
                          <span>{batch.uploadedAt}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400">ID: {batch.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amounts & Expand Toggle */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          {language === 'ID' ? 'Total Nilai Batch' : 'Total Batch Amount'}
                        </div>
                        <div className="font-mono font-extrabold text-sm text-slate-900">
                          {formatCurrencyUSD(batch.totalAmount)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {batch.acceptedRows} {language === 'ID' ? 'baris diterima' : 'accepted rows'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id={`toggle-detail-btn-${batch.id}`}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <span>{isExpanded ? (language === 'ID' ? 'Tutup Rincian' : 'Close Details') : (language === 'ID' ? 'Rincian Status' : 'Status Details')}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Rich Status & Financial Condition Breakdown */}
                  {isExpanded && (
                    <div 
                      id={`batch-expanded-panel-${batch.id}`}
                      className="px-5 pb-6 pt-3 bg-slate-50/80 border-t border-slate-200/80 space-y-4 animate-in fade-in"
                    >
                      {/* Financial Condition Card (Req 10) */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#1E5EFF]" />
                            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                              {language === 'ID' ? 'Detail Kondisi Anggaran & Analisis Status (Budget vs Ingested)' : 'Budget Condition Details & Status Analysis (Budget vs Ingested)'}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400">{language === 'ID' ? 'Status Evaluasi:' : 'Evaluation Status:'}</span>
                            {getBudgetStatusBadge(batch)}
                          </div>
                        </div>

                        {/* 4-Metric Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                              {language === 'ID' ? 'Total Realisasi / Batch' : 'Total Ingested / Batch'}
                            </span>
                            <span className="text-base font-extrabold text-slate-900 font-mono">
                              {formatCurrencyUSD(batch.totalAmount)}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                              {language === 'ID' ? 'Pagu Anggaran Pembanding' : 'Benchmark Target Budget'}
                            </span>
                            <span className="text-base font-extrabold text-slate-700 font-mono">
                              {formatCurrencyUSD(targetBudget)}
                            </span>
                          </div>

                          <div className={`p-3 rounded-xl border ${
                            isOver ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            <span className="text-[11px] font-bold block mb-0.5">
                              {isOver ? (language === 'ID' ? 'Besaran Over Budget (Nominal)' : 'Over Budget Amount (Nominal)') : (language === 'ID' ? 'Selisih / Efisiensi (Under Budget)' : 'Variance / Efficiency (Under Budget)')}
                            </span>
                            <span className="text-base font-extrabold font-mono flex items-center gap-1">
                              {isOver ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-rose-600" />
                                  <span>+{formatCurrencyUSD(Math.abs(varianceVal))}</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                                  <span>-{formatCurrencyUSD(Math.abs(varianceVal))}</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className={`p-3 rounded-xl border ${
                            isOver ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            <span className="text-[11px] font-bold block mb-0.5">
                              {isOver ? (language === 'ID' ? 'Persentase Over Budget' : 'Over Budget Percentage') : (language === 'ID' ? 'Persentase Varians' : 'Variance Percentage')}
                            </span>
                            <span className="text-base font-extrabold font-mono">
                              {variancePctVal > 0 ? `+${variancePctVal.toFixed(2)}%` : `${variancePctVal.toFixed(2)}%`}
                            </span>
                          </div>
                        </div>

                        {/* Narrative Summary Box */}
                        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                          isOver 
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        }`}>
                          <div className="font-bold flex items-center gap-2 mb-1">
                            {isOver ? (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span>{language === 'ID' ? 'Ringkasan Kondisi Anggaran:' : 'Budget Condition Summary:'}</span>
                          </div>
                          <p className="font-sans">
                            {batch.detailsSummary || (isOver
                              ? (language === 'ID'
                                  ? `Data batch ini berstatus OVER BUDGET dengan total kelebihan +${formatCurrencyUSD(Math.abs(varianceVal))} (+${Math.abs(variancePctVal).toFixed(2)}%) di atas pagu anggaran yang direncanakan. Terdapat ${batch.overBudgetAccountsCount || 1} pos COA yang melampaui batas anggaran.`
                                  : `This batch is OVER BUDGET with a total excess of +${formatCurrencyUSD(Math.abs(varianceVal))} (+${Math.abs(variancePctVal).toFixed(2)}%) above planned budget. There are ${batch.overBudgetAccountsCount || 1} COA line items exceeding the budget limit.`)
                              : (language === 'ID'
                                  ? `Data batch ini berstatus UNDER BUDGET (hemat nominal sebesar -${formatCurrencyUSD(Math.abs(varianceVal))} / ${Math.abs(variancePctVal).toFixed(2)}% di bawah pagu anggaran yang direncanakan). Seluruh alokasi berada dalam kendali fiskal yang aman.`
                                  : `This batch is UNDER BUDGET (saving of -${formatCurrencyUSD(Math.abs(varianceVal))} / ${Math.abs(variancePctVal).toFixed(2)}% below planned budget). All allocations are within safe fiscal control.`))}
                          </p>
                        </div>

                        {/* Top Over-Budget Account Highlight if applicable */}
                        {batch.topOverBudgetCoa && (
                          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-amber-900 block">
                              {language === 'ID' ? 'Pos Akun dengan Lonjakan Over Budget Tertinggi:' : 'COA Account with Highest Over Budget Surge:'}
                            </span>
                            <div className="flex items-center justify-between flex-wrap gap-2 text-amber-800">
                              <span className="font-mono font-bold">
                                {batch.topOverBudgetCoa.code} - {batch.topOverBudgetCoa.accountName}
                              </span>
                              <div className="flex items-center gap-3 font-mono">
                                <span>{language === 'ID' ? 'Kelebihan:' : 'Excess:'} <strong>+{formatCurrencyUSD(batch.topOverBudgetCoa.overAmount)}</strong></span>
                                <span className="bg-amber-100 px-2 py-0.5 rounded text-amber-900 font-bold">
                                  +{batch.topOverBudgetCoa.variancePct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Technical File Metadata */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-500 font-mono">
                          <div>{language === 'ID' ? 'Ukuran File' : 'File Size'}: <strong className="text-slate-700">{batch.fileSize}</strong></div>
                          <div>{language === 'ID' ? 'Total Baris File' : 'Total File Rows'}: <strong className="text-slate-700">{batch.rowCount} {language === 'ID' ? 'baris' : 'rows'}</strong></div>
                          <div>{language === 'ID' ? 'Baris Diterima' : 'Accepted Rows'}: <strong className="text-emerald-700">{batch.acceptedRows} {language === 'ID' ? 'baris' : 'rows'}</strong></div>
                          <div>{language === 'ID' ? 'Baris Ditolak' : 'Rejected Rows'}: <strong className="text-slate-700">{batch.rejectedRows} {language === 'ID' ? 'baris' : 'rows'}</strong></div>
                        </div>
                      </div>

                      {/* If Replaced: Show Side-by-Side Version Diff Comparison */}
                      {isReplaced && (
                        <div className="space-y-3">
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-start gap-2.5">
                            <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold text-amber-900 block mb-0.5">
                                {t.replaceJustificationLabel} ({t.replacedOnText} {batch.replacedAt} {t.byText} {batch.replacedBy}):
                              </span>
                              <span className="text-amber-800 font-medium">
                                {batch.replaceReason || (language === 'ID' ? 'Digantikan oleh file batch rekonsiliasi terbaru.' : 'Superseded by latest reconciled batch file.')}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Superseded Version */}
                            <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  {language === 'ID' ? 'Versi Terdahulu (Archived / Replaced)' : 'Superseded Version (Archived / Replaced)'}
                                </span>
                                <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">
                                  {batch.id}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs text-slate-600 font-mono">
                                <div>File: {batch.fileName}</div>
                                <div>Rows: {batch.acceptedRows} {language === 'ID' ? 'baris' : 'rows'}</div>
                                <div className="text-rose-700 font-bold text-sm pt-1">
                                  Total: {formatCurrencyUSD(batch.totalAmount)}
                                </div>
                              </div>
                            </div>

                            {/* Right: Active Version */}
                            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  {language === 'ID' ? 'Versi Pengganti Aktif (Currently Active)' : 'Active Replacement Version (Currently Active)'}
                                </span>
                                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                                  {replacementBatch?.id || batch.replacedBatchId || 'Active'}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs text-slate-600 font-mono">
                                <div>File: {replacementBatch?.fileName || 'Reconciled_Batch_Active.xlsx'}</div>
                                <div>Rows: {replacementBatch?.acceptedRows || batch.acceptedRows} {language === 'ID' ? 'baris' : 'rows'}</div>
                                <div className="text-emerald-700 font-bold text-sm pt-1 flex items-center justify-between">
                                  <span>Total: {formatCurrencyUSD(replacementBatch?.totalAmount || 3_710_900)}</span>
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                    {language === 'ID' ? 'Selisih Revisi' : 'Revision Variance'}: {formatCurrencyUSD(Math.abs(batch.totalAmount - (replacementBatch?.totalAmount || 3_710_900)))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

