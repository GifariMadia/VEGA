import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
  AlertOctagon,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Trash2,
  Hash,
  Search,
  Sparkles,
  Layers,
  Database,
  Filter,
  ChevronDown,
  Info,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { api, type UploadBatch as ServerBatch } from '../../lib/api';
import { uiBatch } from '../../context/ServerUiProvider';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { UploadType, FiscalMonth, FISCAL_MONTHS, CoaCategory, CoaItem } from '../../types';
import { formatCurrencyUSD } from '../../lib/calculations';

interface ServerPreview {
  preview_id: string | null; kind: 'BUDGET' | 'GL'; fiscal_year: number; period: number | null; sheet_read: string;
  total_amount: string; rows_read: number; rows_accepted: number; rows_filtered: number;
  preview_rows: Array<{ coa_code: string; name?: string; category?: string; description?: string; amount?: string; annual_amount?: string; account_number?: string; source_row?: number; row_number?: number; period?: number; monthly?: Record<FiscalMonth, string>; vendor?: string; reference?: string; txn_date?: string; section?: string; currency?: string }>;
  filtered_rows: Array<{ row: number; issue: string; snippet?: string }>;
  warnings: Array<{ issue: string }>; duplicates: Array<{ issue: string }>; unknown_coas: Array<{ coa_code: string }>;
  already_loaded: { exists: boolean; existing_batch: ServerBatch | null };
}

interface ParsedRow {
  rowNum: number;
  coaCode: string;
  accountPattern?: string;
  accountName: string;
  category?: string;
  department?: string;
  sectionCode?: string;
  currency?: string;
  amount: number;
  priorActual?: number;
  forecast?: number;
  isConsolidated?: boolean;
  vendor?: string;
  postingDate?: string;
  reference?: string;
  description?: string;
  docNo?: string;
  monthly?: Record<FiscalMonth, number>;
  periodMonth?: FiscalMonth;
  isValid: boolean;
  isAutoDetected?: boolean;
  errors: string[];
}

interface FilteredRowInfo {
  rowNum: number;
  reason: string;
  snippet: string; rawContent?: string;
}

export const UploadView: React.FC<{
  onNavigateToDashboard?: () => void;
  onNavigateToMatrix: () => void;
  onNavigateToAudit: () => void;
}> = ({
  onNavigateToDashboard,
  onNavigateToMatrix,
  onNavigateToAudit
}) => {
  const {
    availableFiscalYears = [], selectedFiscalYear,
    coaList,
    checkPeriodCollision,
    commitUpload, refreshDashboard
  } = useData();

  const { t, isAdmin, language } = useAuth();

  const [serverPreview, setServerPreview] = useState<ServerPreview | null>(null);
  const [serverError, setServerError] = useState('');
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [uploadType, setUploadType] = useState<UploadType>('Monthly GL');
  const [fiscalYear, setFiscalYear] = useState<string>(selectedFiscalYear || `FY${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}/${new Date().getMonth() >= 3 ? new Date().getFullYear() + 1 : new Date().getFullYear()}`);
  const [targetMonth, setTargetMonth] = useState<FiscalMonth>('Aug');

  // File & Parsing state
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [detectedNewCoas, setDetectedNewCoas] = useState<CoaItem[]>([]);
  const [filteredOutRows, setFilteredOutRows] = useState<FilteredRowInfo[]>([]);
  const [showFilteredDrawer, setShowFilteredDrawer] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawFileBuffer, setRawFileBuffer] = useState<ArrayBuffer | null>(null);
  const [autoDetectionNotice, setAutoDetectionNotice] = useState<string | null>(null);
  const [fileMissingCoaColumn, setFileMissingCoaColumn] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'detected' | 'error'>('all');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Replacement (GANTI DATA) state
  const [existingBatch, setExistingBatch] = useState<any | null>(null);
  const [replaceReason, setReplaceReason] = useState<string>('');
  const [gantiDataConfirmed, setGantiDataConfirmed] = useState<boolean>(false);

  // Commit result state with full budget status details (Req 10)
  const [commitResult, setCommitResult] = useState<ReturnType<typeof commitUpload> | null>(null);

  // Inline row correction state for 100% accuracy enforcement
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<{
    coaCode: string;
    amount: number;
    description: string;
    docNo: string;
  }>({
    coaCode: '',
    amount: 0,
    description: '',
    docNo: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // If not admin, access is restricted
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {language === 'ID' ? 'Hak Akses Administrator Diperlukan' : 'Administrator Privileges Required'}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          {language === 'ID'
            ? 'Unggah data finansial secara langsung mengubah anggaran yang disetujui dan catatan buku besar. Sesuai tata kelola TI dan kebijakan Supabase RLS, hanya Administrator yang dapat melakukan commit data.'
            : 'Financial uploads directly modify approved budgets and general ledger records. According to internal IT governance and Supabase RLS policies, only Administrators may commit data batches.'}
        </p>
      </div>
    );
  }

  const templateFile = async () => {
    const kind = uploadType === 'Budget' ? 'BUDGET' : 'GL';
    const response = await fetch(`/api/v1/uploads/templates/${kind}`, { headers: { Authorization: `Bearer ${api.getToken()}` } });
    if (!response.ok) throw new Error('Template tidak dapat diunduh.');
    return new File([await response.blob()], `${kind === 'BUDGET' ? 'Budget' : 'GL'} Dummy.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };
  const handleDownloadTemplate = async () => {
    try {
      const file = await templateFile(); const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url);
    } catch (reason) { setServerError(reason instanceof Error ? reason.message : 'Gagal mengunduh template.'); }
  };
  const handleStartEditRow = (_row: ParsedRow) => { setServerError('Perbaiki baris di file Excel lalu unggah ulang agar preview dan data tersimpan tetap sama.'); };
  const handleSaveEditedRow = () => { setEditingRowIndex(null); };
  const handleDeleteRow = (_rowNum: number) => { setServerError('Hapus baris di file Excel lalu unggah ulang agar total upload tetap dapat diverifikasi.'); };
  const handleSwitchSheet = (_name: string) => {};

  // Process File ingestion with auto-detection of sheets and headers
  const processFile = async (file: File) => {
    if (isProcessing) return;
    setIsProcessing(true); setSavedTotal(null); setServerError(''); setServerPreview(null); setCommitResult(null);
    setParsedRows([]); setDetectedNewCoas([]); setExistingBatch(null); setFilteredOutRows([]);
    setUploadedFileName(file.name); setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Format file tidak sesuai. Gunakan workbook .xlsx untuk Budget atau GL.');
      if (file.size === 0) throw new Error('File kosong. Pilih workbook Excel yang berisi data.');
      if (file.size > 50 * 1024 * 1024) throw new Error('Ukuran file melebihi batas 50 MB.');
      const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      if (signature[0] !== 0x50 || signature[1] !== 0x4b) throw new Error('Isi file bukan workbook .xlsx yang valid. Mengubah nama ekstensi file tidak mengubah formatnya.');
      const form = new FormData(); form.append('file', file); form.append('kind', uploadType === 'Budget' ? 'BUDGET' : 'GL'); form.append('register_new_coas', 'true');
      const response = await api.request<ServerPreview>('/uploads/preview', { method: 'POST', body: form });
      if (!response.success || !response.data.preview_id) throw new Error(response.errors?.map(error => `${error.row ? `Baris ${error.row}: ` : ''}${error.issue}`).join('\n') || response.message);
      const preview = {
        ...response.data,
        filtered_rows: response.data.filtered_rows ?? [],
        unknown_coas: response.data.unknown_coas ?? [],
        warnings: response.data.warnings ?? [],
        duplicates: response.data.duplicates ?? [],
        preview_rows: response.data.preview_rows ?? [],
      };
      if (!Array.isArray(response.data.preview_rows)) throw new Error('Server upload masih memakai versi lama. Buka tautan aplikasi terbaru lalu unggah ulang.');
      setServerPreview(preview);
      setFiscalYear(`FY${preview.fiscal_year}/${preview.fiscal_year + 1}`);
      if (preview.period) setTargetMonth(FISCAL_MONTHS[preview.period - 1]);
      setSelectedSheet(preview.sheet_read); setAvailableSheets([preview.sheet_read]);
      setFilteredOutRows(preview.filtered_rows.map(row => ({ rowNum: row.row, reason: row.issue, snippet: row.snippet || '', rawContent: row.snippet || '' })));
      const unknown = new Set(preview.unknown_coas.map(account => account.coa_code));
      setParsedRows(preview.preview_rows.map(row => ({
        rowNum: row.source_row || row.row_number || 0, coaCode: row.coa_code, accountName: row.name || row.description || row.coa_code,
        category: row.category || coaList.find(coa => coa.code === row.coa_code)?.category || 'Uncategorized',
        amount: Number(row.annual_amount ?? row.amount ?? 0), accountPattern: row.account_number, description: row.description,
        vendor: row.vendor, postingDate: row.txn_date, reference: row.reference, docNo: row.reference,
        sectionCode: row.section, currency: row.currency, monthly: row.monthly ? Object.fromEntries(Object.entries(row.monthly).map(([month, value]) => [month, Number(value)])) as Record<FiscalMonth, number> : undefined,
        periodMonth: row.period ? FISCAL_MONTHS[row.period - 1] : undefined, isValid: true, errors: [], isAutoDetected: unknown.has(row.coa_code)
      })));
      setDetectedNewCoas(preview.unknown_coas.map(account => ({ code: account.coa_code, accountName: preview.preview_rows.find(row => row.coa_code === account.coa_code)?.description || account.coa_code, category: 'Uncategorized', department: 'MIS Department', registerSystem: 'Auto-Detected', status: 'Active', description: 'Akan didaftarkan saat konfirmasi upload.', inScope: true })));
      setAutoDetectionNotice([`Periode file: FY${preview.fiscal_year}/${preview.fiscal_year + 1}${preview.period ? ` (${FISCAL_MONTHS[preview.period - 1]})` : ''}.`, ...[...preview.warnings, ...preview.duplicates].map(warning => warning.issue)].join(' | '));
      setFileMissingCoaColumn(false); setCurrentStep(2);
    } catch (reason) { setServerError(reason instanceof Error ? reason.message : 'Gagal membaca file.'); }
    finally { setIsProcessing(false); }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Quick Demo Fill: Standard clean sample
  const handleLoadSample = async (withErrors: boolean = false) => {
    try {
      let file = await templateFile();
      if (withErrors) {
        const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = book.Sheets[uploadType === 'Budget' ? 'MIS (FC)' : 'CORE'];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        for (let row = 1; row <= range.e.r + 1; row++) {
          const account = String(sheet[`${uploadType === 'Budget' ? 'A' : 'D'}${row}`]?.v || '');
          if ((uploadType === 'Budget' && /^\d{9}$/.test(account)) || (uploadType !== 'Budget' && account.endsWith('-MIS000'))) {
            sheet[`${uploadType === 'Budget' ? 'G' : 'N'}${row}`] = { t: 's', v: 'NOT_A_NUMBER' }; break;
          }
        }
        file = new File([XLSX.write(book, { type: 'array', bookType: 'xlsx' })], 'Contoh-Validasi-Error.xlsx', { type: file.type });
      }
      await processFile(file);
    } catch (reason) { setServerError(reason instanceof Error ? reason.message : 'Gagal membaca contoh.'); }
  };

  // Accepted & rejected computations
  const acceptedRows = parsedRows.filter((r) => r.isValid);
  const rejectedRows = parsedRows.filter((r) => !r.isValid);
  const totalAmount = savedTotal ?? Number(serverPreview?.total_amount || 0);

  // 100% Accuracy checks
  const is100PercentAccurate = !!serverPreview?.preview_id && parsedRows.length > 0 && rejectedRows.length === 0;
  const accuracyPercentage = parsedRows.length > 0
    ? ((acceptedRows.length / parsedRows.length) * 100).toFixed(0)
    : '0';

  // Filtered rows for step 2 preview
  const filteredPreviewRows = acceptedRows.filter((r) => {
    if (previewFilter === 'detected' && !r.isAutoDetected) return false;
    if (previewFilter === 'valid' && r.isAutoDetected) return false;
    if (!previewSearch.trim()) return true;
    const q = previewSearch.toLowerCase();
    return (
      r.coaCode.toLowerCase().includes(q) ||
      (r.accountPattern && r.accountPattern.toLowerCase().includes(q)) ||
      (r.accountName && r.accountName.toLowerCase().includes(q)) ||
      (r.vendor && r.vendor.toLowerCase().includes(q)) ||
      (r.docNo && r.docNo.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  // Transition from Step 2 to Step 3
  const handleProceedToStep3 = () => {
    const collision = serverPreview?.already_loaded.existing_batch ? uiBatch(serverPreview.already_loaded.existing_batch) : null;
    setExistingBatch(collision);
    setGantiDataConfirmed(!collision);
    setCurrentStep(3);
  };

  // Final Commit action
  const handleCommit = async () => {
    if (!serverPreview?.preview_id || isSubmitting) return;
    if (existingBatch && (!gantiDataConfirmed || !replaceReason.trim())) {
      setServerError('Konfirmasi GANTI DATA dan isi alasan penggantian terlebih dahulu.'); return;
    }
    setIsSubmitting(true); setServerError('');
    try {
      const response = await api.request<{ batch_id: number }>('/uploads/confirm', { method: 'POST', body: JSON.stringify({ preview_id: serverPreview.preview_id, decision: existingBatch ? 'REPLACE' : 'CONFIRM', replace_reason: existingBatch ? replaceReason : undefined }) });
      if (!response.success) throw new Error(response.message);
      setCommitResult({ success: true, batchId: String(response.data.batch_id), detailsSummary: 'Data disimpan dari pratinjau server. Dashboard menghitung batch aktif yang sama.' });
      setSavedTotal(Number(serverPreview.total_amount));
      setServerPreview(preview => preview ? { ...preview, preview_id: null } : null);
      try { await refreshDashboard(); } catch { setServerError('Data berhasil disimpan, tetapi dashboard belum termuat. Muat ulang halaman.'); }
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (reason) { setServerError(reason instanceof Error ? reason.message : 'Gagal menyimpan upload.'); }
    finally { setIsSubmitting(false); }
  };

  const handleResetUpload = () => {
    if (serverPreview?.preview_id) void api.request('/uploads/confirm', { method: 'POST', body: JSON.stringify({ preview_id: serverPreview.preview_id, decision: 'CANCEL' }) }).catch(() => undefined);
    setServerPreview(null); setSavedTotal(null); setServerError('');
    setCurrentStep(1);
    setParsedRows([]);
    setDetectedNewCoas([]);
    setFileMissingCoaColumn(false);
    setPreviewSearch('');
    setPreviewFilter('all');
    setUploadedFileName('');
    setUploadedFileSize('');
    setExistingBatch(null);
    setReplaceReason('');
    setGantiDataConfirmed(false);
    setCommitResult(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {isProcessing && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700">{language === 'ID' ? 'Mengunggah dan memvalidasi file…' : 'Uploading and validating file…'}</p>}
      {serverError && <p role="alert" className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"><strong>{language === 'ID' ? 'Validasi / proses gagal (false)' : 'Validation / processing failed (false)'}</strong>{'\n'}{serverError}</p>}
      {!isProcessing && !serverError && serverPreview?.preview_id && currentStep !== 3 && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">{language === 'ID' ? 'Validasi file berhasil (true). Data disimpan setelah konfirmasi.' : 'File validation passed (true). Data is saved after confirmation.'}</p>}
      {/* Wizard Progress Steps */}
      <div
        id="upload-wizard-progress"
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs"
      >
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 1
                ? 'bg-[#1E5EFF] text-white shadow-sm'
                : currentStep > 1
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'ID' ? 'Langkah 1' : 'Step 1'}
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">{t.uploadStep1}</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 2
                ? 'bg-[#1E5EFF] text-white shadow-sm'
                : currentStep > 2
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'ID' ? 'Langkah 2' : 'Step 2'}
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">{t.uploadStep2}</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 3
                ? 'bg-[#1E5EFF] text-white shadow-sm'
                : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {language === 'ID' ? 'Langkah 3' : 'Step 3'}
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">{t.uploadStep3}</p>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: Upload Configuration */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              1. {t.uploadStep1}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ID'
                ? 'Pilih target periode data dan unduh templat resmi yang telah diselaraskan dengan akun Master COA.'
                : 'Select the data ingestion target and download the official template pre-aligned with registered COA accounts.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Type Radio Cards */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                {t.uploadType}
              </label>

              {/* Monthly GL Actuals */}
              <label
                onClick={() => { handleResetUpload(); setUploadType('Monthly GL'); }}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition ${
                  uploadType === 'Monthly GL'
                    ? 'border-[#1E5EFF] bg-blue-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="uploadType"
                  checked={uploadType === 'Monthly GL'}
                  onChange={() => setUploadType('Monthly GL')}
                  className="mt-1 text-[#1E5EFF]"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">{t.typeGl}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'ID'
                      ? 'Impor pengeluaran aktual bulanan dari ERP untuk periode bulan yang telah tutup buku.'
                      : 'Import ERP monthly posted expenses (Actuals) for specific closed period month.'}
                  </p>
                </div>
              </label>

              {/* Annual Budget Allocation */}
              <label
                onClick={() => { handleResetUpload(); setUploadType('Budget'); }}
                className={`p-4 rounded-2xl border-2 cursor-pointer flex items-start gap-3 transition ${
                  uploadType === 'Budget'
                    ? 'border-[#1E5EFF] bg-blue-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="uploadType"
                  checked={uploadType === 'Budget'}
                  onChange={() => setUploadType('Budget')}
                  className="mt-1 text-[#1E5EFF]"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">{t.typeBudget}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'ID'
                      ? 'Tetapkan atau revisi alokasi budget anggaran tahunan 12 bulan (Apr - Mar) untuk seluruh akun pos TI.'
                      : 'Establish or revise 12-month annual approved budgets (Apr - Mar) for all IT accounts.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Target Period & Downloads */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.targetFiscalYear}
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="w-full text-xs font-bold py-2.5 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5EFF]"
                >
                  {[...new Set([fiscalYear, ...availableFiscalYears])].map(fy => <option key={fy} value={fy}>{fy.replace('FY', 'FY ')}</option>)}
                </select>
              </div>

              {uploadType === 'Monthly GL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t.targetMonthPeriod}
                  </label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value as FiscalMonth)}
                    className="w-full text-xs font-bold py-2.5 px-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5EFF]"
                  >
                    {FISCAL_MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m} ({language === 'ID' ? 'Periode Fiskal' : 'Fiscal Period'} {m})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/60">
                <button
                  id="download-template-btn"
                  onClick={handleDownloadTemplate}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#1E5EFF]" />
                  <span>{t.downloadTemplate} (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Drag & Drop Zone */}
          <div
            id="drag-drop-zone"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition ${
              dragActive
                ? 'border-[#1E5EFF] bg-blue-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />
            <div className="w-14 h-14 bg-white text-[#1E5EFF] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs border border-slate-200">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {t.dragDropText}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t.orBrowse} ({language === 'ID' ? 'Excel 2007+ .xlsx' : 'Excel 2007+ .xlsx'})
            </p>
          </div>

          {/* Quick Demo Pre-fill helpers */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
            <span className="text-slate-400 font-medium">
              {language === 'ID' ? 'Shortcut Uji Coba:' : 'Testing Shortcuts:'}
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                id="load-sample-valid-btn"
                type="button"
                onClick={() => handleLoadSample(false)}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold border border-emerald-200 transition cursor-pointer"
              >
                {language === 'ID' ? `Contoh Valid (${coaList.length} Baris)` : `Sample Valid (${coaList.length} Rows)`}
              </button>
              <button
                id="load-sample-errors-btn"
                type="button"
                onClick={() => handleLoadSample(true)}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold border border-rose-200 transition cursor-pointer"
              >
                {language === 'ID' ? 'Contoh Format Eror' : 'Sample Error File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Validation Summary & Row Inspection */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                2. {t.validationSummary}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ID' ? 'Berkas' : 'File'}: <strong className="text-slate-800">{uploadedFileName}</strong> ({uploadedFileSize}) • {language === 'ID' ? 'Target' : 'Target'}: {fiscalYear} {uploadType === 'Monthly GL' ? `• ${language === 'ID' ? 'Bulan' : 'Month'}: ${targetMonth}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {availableSheets.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-500 font-bold">Sheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSwitchSheet(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg font-bold text-slate-800 px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-[#1E5EFF]"
                  >
                    {availableSheets.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleResetUpload}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition self-start cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.backToStep1}</span>
              </button>
            </div>
          </div>

          {/* Auto-Detection Notification Banner */}
          {autoDetectionNotice && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1E5EFF] shrink-0" />
                <span>{autoDetectionNotice}</span>
              </div>
              <button
                onClick={() => setAutoDetectionNotice(null)}
                className="text-blue-500 hover:text-blue-800 text-xs px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Auto-Filtered Rows Banner (Subtotals, Banners, Notes Filtered Out) */}
          {filteredOutRows.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                    🛡️
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900">
                      {language === 'ID'
                        ? `Pembersihan Otomatis Berhasil (${filteredOutRows.length} Baris Non-Data Disaring)`
                        : `Auto-Cleanup Successful (${filteredOutRows.length} Non-Data Rows Filtered)`}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {language === 'ID'
                        ? 'Sistem otomatis memisahkan baris subtotal, judul seksi, baris kosong, dan catatan kaki agar tidak perlu dirapikan manual.'
                        : 'The system automatically filtered out subtotals, section headers, blank rows, and footers.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilteredDrawer(!showFilteredDrawer)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  {showFilteredDrawer
                    ? (language === 'ID' ? 'Tutup Rincian' : 'Hide Details')
                    : (language === 'ID' ? `Lihat ${filteredOutRows.length} Baris yang Disaring` : `View ${filteredOutRows.length} Filtered Rows`)}
                </button>
              </div>

              {showFilteredDrawer && (
                <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-3">{language === 'ID' ? 'Baris #' : 'Row #'}</th>
                        <th className="py-2 px-3">{language === 'ID' ? 'Alasan Disaring' : 'Filter Reason'}</th>
                        <th className="py-2 px-3">{language === 'ID' ? 'Teks / Konten Asli' : 'Raw Content'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredOutRows.map((fr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-bold text-slate-500">
                            {language === 'ID' ? 'Baris' : 'Row'} {fr.rowNum}
                          </td>
                          <td className="py-2 px-3">
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {fr.reason}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 truncate max-w-xs font-sans">
                            {fr.rawContent || (language === 'ID' ? '(baris kosong)' : '(empty row)')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Accuracy Status Banner */}
          {is100PercentAccurate ? (
            <div
              id="accuracy-100-success-banner"
              className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                    <span>{language === 'ID' ? 'Semua Baris Data Tervalidasi' : 'All Data Rows Validated'}</span>
                    <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                      100% Valid
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {language === 'ID'
                      ? `Seluruh ${parsedRows.length} baris telah tervalidasi dan cocok dengan kode COA Master TI MIS tanpa kesalahan format.`
                      : `All ${parsedRows.length} rows have been validated and match MIS IT Master COA accounts without format issues.`}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-emerald-800 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
                Total: {formatCurrencyUSD(totalAmount, true)}
              </div>
            </div>
          ) : (
            <div
              id="accuracy-incomplete-warning-banner"
              className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                    <span>
                      {language === 'ID'
                        ? 'Perhatian: Terdapat Baris Data Ditolak (Isu Format Data)'
                        : 'Warning: Rejected Format Issues Detected'}
                    </span>
                    <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      {language === 'ID' ? 'Valid' : 'Valid'}: {acceptedRows.length} / {parsedRows.length} ({accuracyPercentage}%)
                    </span>
                  </h4>
                  <p className="text-xs text-rose-900 mt-0.5 leading-relaxed">
                    {language === 'ID' ? (
                      <>Terdapat <strong>{rejectedRows.length} baris</strong> yang masuk ke daftar <strong>Isu Format Ditolak</strong> (kolom/kode COA tidak terisi, tidak terdaftar di MIS, atau nominal tidak valid). Silakan gunakan tombol <strong>Koreksi</strong> untuk memetakan ke COA resmi atau <strong>Hapus</strong> pada baris bersangkutan sebelum melanjutkan.</>
                    ) : (
                      <>There are <strong>{rejectedRows.length} rows</strong> with format issues (missing COA, unregistered code, or invalid numeric amount). Use <strong>Correct</strong> to map to an active COA or <strong>Delete</strong> the row before proceeding.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.totalRows}</div>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">{parsedRows.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {language === 'ID' ? 'Total Baris Berkas' : 'Total File Rows'}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">{t.acceptedRows}</div>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">{acceptedRows.length}</div>
              <div className="text-[11px] text-emerald-600 font-mono mt-0.5">
                Total: {formatCurrencyUSD(totalAmount, true)}
              </div>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
              <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                {language === 'ID' ? 'Isu Format Ditolak' : 'Rejected Format Issues'}
              </div>
              <div className="text-2xl font-black font-mono text-rose-700 mt-1">{rejectedRows.length}</div>
              <div className="text-[11px] text-rose-600 mt-0.5 font-bold">
                {rejectedRows.length > 0
                  ? (language === 'ID' ? `${rejectedRows.length} baris bermasalah` : `${rejectedRows.length} format issues`)
                  : (language === 'ID' ? '0 Masalah Format' : '0 Format Issues')}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${is100PercentAccurate ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`text-[11px] font-bold uppercase tracking-wider ${is100PercentAccurate ? 'text-[#1E5EFF]' : 'text-amber-700'}`}>
                {language === 'ID' ? 'Status Validasi' : 'Validation Status'}
              </div>
              <div className={`text-2xl font-black font-mono mt-1 ${is100PercentAccurate ? 'text-blue-700' : 'text-amber-800'}`}>
                {accuracyPercentage}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {is100PercentAccurate
                  ? (language === 'ID' ? 'Baris diterima valid; cek baris tersaring dan peringatan' : 'Accepted rows valid; review filtered rows and warnings')
                  : (language === 'ID' ? 'Perlu Koreksi Manual' : 'Action Required')}
              </div>
            </div>
          </div>

          {/* Missing COA column warning banner */}
          {fileMissingCoaColumn && (
            <div className="p-4 bg-rose-100/80 border-2 border-rose-400 rounded-2xl flex items-start gap-3 text-rose-950 text-xs shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-black text-rose-900 block">
                  {language === 'ID'
                    ? 'Ditolak: Isu Format — Kolom Kode COA Tidak Ditemukan!'
                    : 'Rejected: Format Issues — Missing COA Code Column!'}
                </strong>
                <p className="text-rose-800 leading-relaxed text-xs">
                  {language === 'ID'
                    ? 'File spreadsheet yang Anda unggah tidak memiliki kolom Kode COA / Account Number (misal: Account Number, Kode Akun, COA, No. Rekening). Baris data otomatis ditolak karena kolom kode akun wajib ada untuk pemetaan buku besar.'
                    : 'The uploaded spreadsheet is missing an Account Number / COA Code column (e.g. Account Number, COA, Account Code). Data rows are rejected because account codes are mandatory for ledger posting.'}
                </p>
              </div>
            </div>
          )}

          {/* Error Details Log (If any rejected rows) with Inline Fixer */}
          {rejectedRows.length > 0 && (
            <div className="p-5 bg-rose-50/80 rounded-2xl border-2 border-rose-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/80 pb-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {language === 'ID'
                      ? `Daftar ${rejectedRows.length} Baris Ditolak (Isu Format Data):`
                      : `List of ${rejectedRows.length} Rejected Rows (Format Issues):`}
                  </span>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-bold bg-rose-200/90 text-rose-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {language === 'ID' ? 'Isu Format Ditolak' : 'Rejected Format Issues'}
                </span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                {language === 'ID'
                  ? 'Baris di bawah ini masuk ke daftar Isu Format Ditolak (misal: kolom Kode COA tidak ditemukan, kode COA tidak terdaftar di sistem, atau format nominal tidak valid). Anda dapat menggunakan tombol Koreksi untuk memilih COA resmi atau Hapus untuk mengeluarkan baris.'
                  : 'The rows below have format issues (missing COA, unregistered code, or invalid numeric amount). Use Correct to map to an official COA or Delete to remove the row.'}
              </p>

              <div className="max-h-72 overflow-y-auto divide-y divide-rose-200/70 text-xs">
                {rejectedRows.map((r) => (
                  <div key={r.rowNum} className="py-3 px-3 my-1 rounded-xl bg-white/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-900 bg-rose-200/90 px-2 py-0.5 rounded text-[11px]">
                          {language === 'ID' ? 'Baris Excel' : 'Excel Row'} {r.rowNum}
                        </span>
                        <span className="text-slate-800 font-mono text-[11px]">
                          {language === 'ID' ? 'Kode' : 'Code'}: <strong>{r.coaCode || (language === 'ID' ? '(tidak ada COA)' : '(no COA)')}</strong>
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        {language === 'ID' ? 'Akun / Uraian' : 'Account / Desc'}: <strong className="text-slate-900">{r.accountName || r.description || (language === 'ID' ? '(Tanpa Nama Akun / Kosong)' : '(No Account Name / Blank)')}</strong>
                      </div>
                    </div>

                    <div className="text-rose-700 font-semibold text-xs flex-1 sm:text-right">
                      {r.errors.join('; ')}
                    </div>

                    {/* Inline Actions: Koreksi & Hapus */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleStartEditRow(r)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg border border-slate-300 text-xs font-bold transition cursor-pointer shadow-2xs"
                        title={language === 'ID' ? 'Petakan ke COA valid' : 'Map to valid COA'}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#1E5EFF]" />
                        <span>{language === 'ID' ? 'Koreksi' : 'Correct'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRow(r.rowNum)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                        title={language === 'ID' ? 'Hapus baris ini dari data yang akan diunggah' : 'Delete this row from batch'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === 'ID' ? 'Hapus' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Edit Modal if user clicks 'Koreksi' */}
          {editingRowIndex !== null && (
            <div className="p-4 bg-blue-50/70 border-2 border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <h5 className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-[#1E5EFF]" />
                  <span>
                    {language === 'ID'
                      ? `Koreksi Baris ${editingRowIndex} ke Akun COA Resmi`
                      : `Correct Row ${editingRowIndex} to Registered COA Account`}
                  </span>
                </h5>
                <button
                  onClick={() => setEditingRowIndex(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ID' ? 'Pilih Kode COA Valid:' : 'Select Valid COA Code:'}
                  </label>
                  <select
                    value={editFormData.coaCode}
                    onChange={(e) => setEditFormData({ ...editFormData, coaCode: e.target.value })}
                    className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  >
                    <option value="">
                      {language === 'ID' ? '-- Pilih COA Terdaftar --' : '-- Select Registered COA --'}
                    </option>
                    {coaList.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ID' ? 'Nominal (USD):' : 'Amount (USD):'}
                  </label>
                  <input
                    type="number"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                    className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ID' ? 'Nomor Dokumen SAP / GL:' : 'SAP / GL Document No:'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.docNo}
                    onChange={(e) => setEditFormData({ ...editFormData, docNo: e.target.value })}
                    className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingRowIndex(null)}
                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200/50 rounded-lg cursor-pointer"
                >
                  {language === 'ID' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveEditedRow}
                  className="px-4 py-1.5 bg-[#1E5EFF] text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  {language === 'ID' ? 'Simpan & Revalidasi' : 'Save & Revalidate'}
                </button>
              </div>
            </div>
          )}

          {/* Validated Rows Preview Table */}
          <div className="space-y-3">
            {detectedNewCoas.length > 0 && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1E5EFF] shrink-0" />
                  <span>
                    <strong>
                      {language === 'ID'
                        ? `${detectedNewCoas.length} Akun GL Baru Terdeteksi Otomatis`
                        : `${detectedNewCoas.length} New GL Accounts Auto-Detected`}
                    </strong> {language === 'ID'
                      ? 'dari file aktual SAP (otomatis didaftarkan ke Master Data COA saat batch di-commit).'
                      : 'from SAP actuals (automatically registered to Master COA upon batch commit).'}
                  </span>
                </div>
                <span className="font-mono font-bold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md shrink-0">
                  SAP Core GL
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>
                    {language === 'ID'
                      ? `Pratinjau Data Aktual (${filteredPreviewRows.length} dari ${acceptedRows.length} Baris Valid)`
                      : `Actual Data Preview (${filteredPreviewRows.length} of ${acceptedRows.length} Valid Rows)`}
                  </span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {is100PercentAccurate
                    ? (language === 'ID' ? '✓ 100% Seluruh Baris Terbaca & Lolos Validasi' : '✓ 100% All Rows Validated & Matched')
                    : (language === 'ID' ? 'Menunggu perbaikan baris yang gagal' : 'Awaiting correction of failed rows')}
                </span>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder={language === 'ID' ? 'Cari akun, vendor, no dokumen...' : 'Search account, vendor, doc no...'}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 w-48 sm:w-60 focus:bg-white focus:ring-1 focus:ring-[#1E5EFF] outline-none"
                  />
                  {previewSearch && (
                    <button
                      onClick={() => setPreviewSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${previewFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {language === 'ID' ? 'Semua' : 'All'} ({acceptedRows.length})
                  </button>
                  {detectedNewCoas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('detected')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${previewFilter === 'detected' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-blue-700'}`}
                    >
                      ✨ {language === 'ID' ? 'Terdeteksi' : 'Detected'} ({detectedNewCoas.length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'Kode COA & Segmen' : 'COA Code & Segment'}</th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'Nama Akun & Kategori' : 'Account Name & Category'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'ID' ? 'Nominal (Aktual)' : 'Amount (Actual)'}</th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'Vendor / Rekanan' : 'Vendor / Partner'}</th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'No. Dokumen / Ref' : 'Doc No. / Ref'}</th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'Status' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredPreviewRows.slice(0, 100).map((r) => (
                    <tr key={r.rowNum} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{r.coaCode}</div>
                        {r.accountPattern && r.accountPattern !== r.coaCode && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                            {r.accountPattern}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <div className="text-slate-800 font-medium">{r.accountName}</div>
                        {r.category && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {r.category}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        <span className={r.amount < 0 ? 'text-amber-700' : 'text-slate-900'}>
                          {formatCurrencyUSD(r.amount, true)}
                        </span>
                        {r.amount < 0 && (
                          <div className="text-[9px] text-amber-600 font-sans font-bold">
                            {language === 'ID' ? 'Kredit / Reversal' : 'Credit / Reversal'}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                        {r.vendor || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        <div>{r.docNo}</div>
                        {r.reference && <div className="text-[10px] text-slate-400">{r.reference}</div>}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        {r.isAutoDetected ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200 whitespace-nowrap">
                            ✨ {language === 'ID' ? 'Terdeteksi SAP' : 'SAP Detected'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200 whitespace-nowrap">
                            {language === 'ID' ? '100% Cocok' : '100% Matched'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPreviewRows.length > 100 && (
              <div className="text-[11px] text-slate-400 text-center font-medium">
                {language === 'ID'
                  ? `Menampilkan 100 baris pertama dari ${filteredPreviewRows.length} baris. Seluruh ${filteredPreviewRows.length} baris akan diproses saat di-commit.`
                  : `Showing first 100 of ${filteredPreviewRows.length} rows. All ${filteredPreviewRows.length} rows will be committed.`}
              </div>
            )}
          </div>

          {/* Step 2 Action Buttons with Strict 100% Enforcement */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={handleResetUpload}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              {t.cancelUpload}
            </button>

            <div className="flex items-center gap-3">
              {!is100PercentAccurate && (
                <span className="text-xs text-rose-600 font-semibold hidden sm:inline">
                  {language === 'ID'
                    ? 'Tombol terkunci: Akurasi harus 100% untuk melanjutkan'
                    : 'Locked: 100% accuracy required to proceed'}
                </span>
              )}
              <button
                id="proceed-to-step3-btn"
                onClick={handleProceedToStep3}
                disabled={!is100PercentAccurate}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition ${
                  is100PercentAccurate
                    ? 'bg-[#1E5EFF] hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <span>{t.proceedToStep3}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Confirmation & Commit (GANTI DATA check) */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                3. {t.uploadStep3}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ID'
                  ? 'Tinjau parameter batch dan konfirmasi komitmen ke buku besar.'
                  : 'Review batch parameters and confirm ledger commitment.'}
              </p>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.backToStep2}</span>
            </button>
          </div>

          {/* Batch Summary Confirmation Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1E5EFF] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {language === 'ID' ? 'Ringkasan Batch Komitmen Buku Besar' : 'Ledger Commitment Batch Summary'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {language === 'ID' ? 'Berkas' : 'File'}: <span className="font-mono font-semibold text-slate-700">{uploadedFileName || (language === 'ID' ? 'Berkas Excel' : 'Excel Batch')}</span> • {acceptedRows.length} {language === 'ID' ? 'baris valid (Departemen MIS)' : 'valid rows (MIS Department)'}
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'ID' ? 'Total Nilai Batch' : 'Total Batch Amount'}
              </div>
              <div className="text-base font-extrabold font-mono text-[#1E5EFF]">
                {formatCurrencyUSD(totalAmount, true)}
              </div>
            </div>
          </div>

          {/* GANTI DATA Collision Alert Box */}
          {existingBatch ? (
            <div
              id="ganti-data-warning-box"
              className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-4 animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">
                    {t.gantiDataWarning}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {t.gantiDataDesc}
                  </p>
                </div>
              </div>

              {/* Existing Batch Details */}
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 text-xs font-mono space-y-1">
                <div className="text-slate-600">
                  {language === 'ID' ? 'Batch Aktif:' : 'Active Batch:'} <strong className="text-slate-900">{existingBatch.id}</strong>
                </div>
                <div className="text-slate-600">
                  {language === 'ID' ? 'Nama Berkas:' : 'File Name:'} {existingBatch.fileName} ({existingBatch.uploadedAt} {language === 'ID' ? 'oleh' : 'by'} {existingBatch.uploadedBy})
                </div>
                <div className="text-slate-600">
                  {language === 'ID' ? 'Total Saat Ini:' : 'Current Total:'} <strong className="text-slate-900">{formatCurrencyUSD(existingBatch.totalAmount, true)}</strong> → {language === 'ID' ? 'Total Baru:' : 'New Total:'} <strong className="text-blue-700">{formatCurrencyUSD(totalAmount, true)}</strong>
                </div>
              </div>

              {/* Replacement Reason Field (Mandatory) */}
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1.5">
                  {t.changeReasonLabel}
                </label>
                <textarea
                  id="ganti-data-reason-input"
                  rows={2}
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder={t.changeReasonPlaceholder}
                  className="w-full p-3 text-xs bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-sans text-slate-800"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="ganti-data-confirm-checkbox"
                  type="checkbox"
                  checked={gantiDataConfirmed}
                  onChange={(e) => setGantiDataConfirmed(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-950">
                  {language === 'ID'
                    ? `Saya memahami bahwa tindakan ini akan menggantikan data aktif untuk ${fiscalYear} ${uploadType === 'Monthly GL' ? `(${targetMonth})` : ''} dan mencatat riwayat audit trail permanen.`
                    : `I understand this will supersede active data for ${fiscalYear} ${uploadType === 'Monthly GL' ? `(${targetMonth})` : ''} and record an immutable audit trail entry.`}
                </span>
              </label>
            </div>
          ) : (
            /* Clean New Period Banner */
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="font-bold">
                  {language === 'ID' ? 'Target Periode Baru Terkonfirmasi' : 'New Period Target Confirmed'}
                </div>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  {language === 'ID'
                    ? `Tidak ditemukan batch aktif sebelumnya untuk ${fiscalYear} ${uploadType === 'Monthly GL' ? `(${targetMonth})` : ''}. Unggahan ini akan didaftarkan sebagai batch dasar.`
                    : `No existing active batch found for ${fiscalYear} ${uploadType === 'Monthly GL' ? `(${targetMonth})` : ''}. This upload will register as the baseline batch.`}
                </p>
              </div>
            </div>
          )}

          {/* Commit Summary Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-bold block">{language === 'ID' ? 'Tipe' : 'Type'}</span>
              <span className="font-bold text-slate-800">{uploadType}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">{language === 'ID' ? 'Target' : 'Target'}</span>
              <span className="font-bold text-slate-800">{fiscalYear} {uploadType === 'Monthly GL' ? `(${targetMonth})` : ''}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">{language === 'ID' ? 'Baris Disetujui' : 'Committed Rows'}</span>
              <span className="font-bold text-emerald-700">{acceptedRows.length} {language === 'ID' ? 'valid' : 'valid'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">{language === 'ID' ? 'Total Nilai' : 'Total Amount'}</span>
              <span className="font-mono font-bold text-blue-700">{formatCurrencyUSD(totalAmount, true)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={handleResetUpload}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              {t.cancel}
            </button>

            <button
              id="commit-upload-btn"
              onClick={handleCommit}
              disabled={isSubmitting || !serverPreview?.preview_id || (!!existingBatch && (!gantiDataConfirmed || !replaceReason.trim()))}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t.commitData}</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Success Modal with Detailed Budget Status (Req 10) */}
      {commitResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            id="upload-success-card"
            className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-4"
          >
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border shadow-xs ${
              commitResult.isOverBudget
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {commitResult.isOverBudget ? (
                <AlertTriangle className="w-9 h-9 text-rose-600 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {t.uploadSuccessTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ID'
                  ? <>Batch <strong className="font-mono text-slate-800">{commitResult.batchId}</strong> berhasil dicatat ke sistem dan matriks telah diperbarui.</>
                  : <>Batch <strong className="font-mono text-slate-800">{commitResult.batchId}</strong> successfully posted and matrix updated.</>}
              </p>
            </div>

            {/* Detailed Budget Status Card (Req 10) */}
            <div className={`p-4 rounded-2xl border text-left space-y-3 ${
              commitResult.isOverBudget
                ? 'bg-rose-50/60 border-rose-200'
                : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {language === 'ID' ? 'Status Penyimpanan:' : 'Storage Status:'}
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                  commitResult.isOverBudget
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}>
                  {language === 'ID' ? 'DATA TERSIMPAN' : 'DATA SAVED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-white/80 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 block font-sans">
                    {language === 'ID' ? 'Total Batch Diunggah' : 'Total Batch Uploaded'}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrencyUSD(totalAmount)}</span>
                </div>
                <div className="p-2 bg-white/80 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 block font-sans">
                    {language === 'ID' ? 'Baris Tersimpan' : 'Stored Rows'}
                  </span>
                  <span className="font-bold text-slate-700 text-sm">{acceptedRows.length}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600">{language === 'ID' ? 'Status anggaran dihitung dari data Budget dan GL aktif pada dashboard.' : 'Budget status is calculated from active Budget and GL uploads on the dashboard.'}</p>

              <p className="text-xs text-slate-500">{commitResult.detailsSummary}</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                id="success-view-audit-btn"
                onClick={() => {
                  setCommitResult(null);
                  handleResetUpload();
                  onNavigateToAudit();
                }}
                className="w-full py-2.5 bg-[#1E5EFF] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>{language === 'ID' ? 'Lihat Status Rinci di Audit Trail' : 'View Detailed Status in Audit Trail'}</span>
              </button>

              <button
                id="success-view-matrix-btn"
                onClick={() => {
                  setCommitResult(null);
                  handleResetUpload();
                  onNavigateToMatrix();
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t.viewInMatrix}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
