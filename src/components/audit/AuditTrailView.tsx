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
import { DashboardKpiCards } from '../dashboard/DashboardKpiCards';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyUSD } from '../../lib/calculations';
import { BudgetStatus, UploadType } from '../../types';

export const AuditTrailView: React.FC = () => {
  const { uploads, selectedFiscalYear, selectedQuarter, selectedCategory } = useData();
  const { t, language } = useAuth();

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
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

  const getBudgetStatusBadge = (batch: typeof uploads[0]) => {
    if (!batch.budgetStatus) return <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">{batch.status === 'Cancelled' ? (language === 'ID' ? 'Dibatalkan' : 'Cancelled') : (language === 'ID' ? 'Data tersimpan' : 'Stored data')}</span>;
    if (batch.budgetStatus === 'Pending Budget' || batch.budgetStatus === 'Pending GL') return <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">{batch.budgetStatus === 'Pending Budget' ? (language === 'ID' ? 'Budget belum tersedia' : 'Awaiting Budget') : (language === 'ID' ? 'Belum ada GL' : 'Awaiting GL')}</span>;
    if (batch.budgetStatus === 'Allocation') return <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">{language === 'ID' ? 'Alokasi (Budget negatif)' : 'Allocation (negative Budget)'}</span>;
    const isOver = batch.isOverBudget || batch.budgetStatus === 'Over Budget';
    const isUnder = batch.budgetStatus === 'Under Budget';

    if (isOver) {
      const overAmt = batch.overBudgetAmount || Math.max(0, (batch.varianceAmount || 0));
      const overPct = batch.overBudgetPercentage;
      return (
        <span
          id={`budget-badge-over-${batch.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
          title={language === 'ID'
            ? `Batch ini berstatus LEBIH ANGGARAN sebesar +${formatCurrencyUSD(overAmt)} (${overPct === undefined ? 'n.a.' : '+' + overPct.toFixed(2) + '%'})`
            : `This batch is OVER BUDGET by +${formatCurrencyUSD(overAmt)} (${overPct === undefined ? 'n.a.' : '+' + overPct.toFixed(2) + '%'})`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
          <span>{language === 'ID' ? 'Lebih Anggaran:' : 'Over Budget:'} +{formatCurrencyUSD(overAmt, true)} ({overPct === undefined ? 'n.a.' : '+' + overPct.toFixed(1) + '%'})</span>
        </span>
      );
    }

    if (isUnder) {
      const diffAmt = Math.abs(batch.varianceAmount || 0);
      const diffPct = batch.overBudgetPercentage === undefined ? undefined : Math.abs(batch.overBudgetPercentage);
      return (
        <span
          id={`budget-badge-under-${batch.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
          title={language === 'ID'
            ? `Batch ini berstatus DI BAWAH ANGGARAN (hemat ${formatCurrencyUSD(diffAmt)})`
            : `This batch is UNDER BUDGET (saving of ${formatCurrencyUSD(diffAmt)})`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{language === 'ID' ? 'Hemat Anggaran:' : 'Under Budget:'} -{formatCurrencyUSD(diffAmt, true)} ({diffPct === undefined ? 'n.a.' : '-' + diffPct.toFixed(1) + '%'})</span>
        </span>
      );
    }

    return (
      <span
        id={`budget-badge-on-${batch.id}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-blue-50 text-[#1E5EFF] border border-blue-200"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5EFF] shrink-0" />
        <span>{language === 'ID' ? 'Sesuai Anggaran (Dalam Budget)' : 'On Budget (Within Target)'}</span>
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
              ? 'Riwayat upload Budget dan GL. Ringkasan mengikuti filter Dashboard; rincian GL membandingkan Budget bulan file.'
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

      <div className="space-y-3">
        <p className="text-xs text-slate-500">{language === 'ID' ? 'Ringkasan yang sama dengan Dashboard:' : 'Same summary as Dashboard:'} {selectedFiscalYear || '—'} · {selectedQuarter === 'All' ? 'YTD' : selectedQuarter} · {selectedCategory === 'All' ? (language === 'ID' ? 'Semua kategori' : 'All categories') : selectedCategory}</p>
        <DashboardKpiCards />
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
            <option value="Budget">{language === 'ID' ? 'Budget Anggaran Tahunan' : 'Annual Budget'}</option>
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

              const targetBudget = batch.targetBudgetAmount;
              const varianceVal = batch.varianceAmount;
              const variancePctVal = batch.overBudgetPercentage;

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
                            {batch.status === 'Cancelled' ? (language === 'ID' ? 'Dibatalkan' : 'Cancelled') : isReplaced ? t.badgeReplaced : t.badgeActive}
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
                              {batch.overBudgetAccountsCount} {language === 'ID' ? 'Akun Melebihi Budget' : 'Accounts Exceeding Budget'}
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
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-xs text-slate-900">{language === 'ID' ? 'Rincian data tersimpan' : 'Stored data details'} {batch.targetMonth || ''}</h4>
                          {getBudgetStatusBadge(batch)}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          {[
                            [language === 'ID' ? 'Nominal file' : 'File amount', formatCurrencyUSD(batch.totalAmount)],
                            [language === 'ID' ? 'Budget bulan pembanding' : 'Monthly Budget', targetBudget === undefined ? '—' : formatCurrencyUSD(targetBudget)],
                            [language === 'ID' ? 'Selisih (Actual − Budget)' : 'Variance (Actual − Budget)', varianceVal === undefined ? '—' : formatCurrencyUSD(varianceVal)],
                            [language === 'ID' ? 'Persentase selisih' : 'Variance percentage', variancePctVal === undefined ? 'n.a.' : `${variancePctVal.toFixed(2)}%`],
                          ].map(([label, value]) => <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="block text-[11px] font-bold text-slate-500 mb-1">{label}</span><span className="font-mono text-base font-extrabold text-slate-800">{value}</span></div>)}
                        </div>
                        <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">{batch.detailsSummary || (language === 'ID' ? 'Evaluasi Budget tidak tersedia untuk batch ini.' : 'Budget evaluation is unavailable for this batch.')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500">
                          <span>{language === 'ID' ? 'Baris dibaca' : 'Rows read'}: {batch.rowCount}</span>
                          <span>{language === 'ID' ? 'Diterima' : 'Accepted'}: {batch.acceptedRows}</span>
                          <span>{language === 'ID' ? 'Ditolak' : 'Rejected'}: {batch.rejectedRows}</span>
                          <span>Batch ID: {batch.id}</span>
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

