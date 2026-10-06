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
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { UploadType, FiscalMonth, FISCAL_MONTHS, CoaCategory, CoaItem } from '../../types';
import { formatCurrencyUSD } from '../../lib/calculations';

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
  snippet: string;
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
    coaList, 
    checkPeriodCollision, 
    commitUpload,
    refreshDashboard 
  } = useData();

  const { t, isAdmin, language } = useAuth();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [uploadType, setUploadType] = useState<UploadType>('Monthly GL');
  const [fiscalYear, setFiscalYear] = useState<string>('FY2026/2027');
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

  // Key normalizer helper for case-insensitive and punctuation-free column matching
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Strict list of words that indicate a column is a DESCRIPTION or other attribute, NOT a COA code
  const EXCLUDED_COA_KEYWORDS = [
    'description', 'deskripsi', 'name', 'nama', 'uraian', 'keterangan', 'comment',
    'section', 'department', 'departemen', 'divisi', 'category', 'kategori',
    'currency', 'mata uang', 'vendor', 'amount', 'nominal', 'budget', 'actual',
    'date', 'tanggal', 'doc', 'document', 'ref', 'reference'
  ];

  // Primary aliases for COA / Account number columns (English, Indonesian, SAP standards)
  const COA_PRIMARY_ALIASES = [
    'account number', 'account no', 'account no.', 'account code', 'account_code',
    'coa code', 'coa_code', 'coa no', 'coa no.', 'coa number', 'coa',
    'kode coa', 'no coa', 'no. coa', 'nomor coa', 'no.coa',
    'kode akun', 'no akun', 'no. akun', 'nomor akun', 'no.akun',
    'gl account', 'gl account no', 'gl account number', 'gl account code',
    'g/l account', 'g/l account no', 'gl acct', 'gl_acc', 'gl no', 'kode gl',
    'kode rekening', 'no rekening', 'no. rekening', 'nomor rekening', 'rekening',
    'kode perkiraan', 'no perkiraan', 'no. perkiraan', 'nomor perkiraan',
    'chart of account', 'chart of accounts', 'cost center / coa',
    'acc no', 'acc number', 'acc code', 'account'
  ];

  // Helper to identify the COA column key from a row's keys with high precision
  const findCoaKey = (row: Record<string, any>, sampleRows?: Record<string, any>[]): string | undefined => {
    if (!row) return undefined;
    const rowKeys = Object.keys(row);
    const normalizedPossibles = COA_PRIMARY_ALIASES.map(normalizeKey);

    // 1. Exact normalized match with primary aliases
    for (const rk of rowKeys) {
      const nRk = normalizeKey(rk);
      if (normalizedPossibles.includes(nRk)) {
        return rk;
      }
    }

    // 2. Contains coa/account/akun/rekening/perkiraan WITHOUT any excluded descriptive keywords
    for (const rk of rowKeys) {
      const lowKey = rk.toLowerCase();
      const hasCoaWord = ['coa', 'akun', 'rekening', 'perkiraan', 'account'].some(w => lowKey.includes(w));
      const hasExcludedWord = EXCLUDED_COA_KEYWORDS.some(w => lowKey.includes(w));
      if (hasCoaWord && !hasExcludedWord) {
        return rk;
      }
    }

    // 3. Content-based detection: check values across sample rows
    if (sampleRows && sampleRows.length > 0) {
      for (const rk of rowKeys) {
        const lowKey = rk.toLowerCase();
        if (EXCLUDED_COA_KEYWORDS.some(w => lowKey.includes(w))) continue;
        
        let matchCount = 0;
        let nonBlankCount = 0;
        for (const sr of sampleRows) {
          const val = String(sr[rk] ?? '').trim();
          if (!val) continue;
          nonBlankCount++;
          // Checks if value matches SAP 9-digit (\b\d{9}\b) or IT code (IT-\d{5}) or known COA
          if (/^(\d{9}|\d{5}|IT-\d{5}|\d{9}-.*)$/i.test(val) || coaList.some(c => c.code === val)) {
            matchCount++;
          }
        }
        if (nonBlankCount > 0 && matchCount / nonBlankCount >= 0.5) {
          return rk;
        }
      }
    }

    return undefined;
  };

  // Strict matching for fiscal month columns (never matches 'description', 'remarks', etc.)
  const matchFiscalMonthColumn = (rawKey: string): FiscalMonth | null => {
    if (!rawKey) return null;
    const k = rawKey.trim().toLowerCase();
    
    // Explicitly reject descriptive, identification, or irrelevant columns
    // Allow "total" or "budget" only if they are part of a month name or if they are the primary amount indicator
    if (/(desc|desk|uraian|keterangan|nama|name|dept|div|vendor|account|rekening|perkiraan|rem|catatan|note|actual|forecast|cost|target|pagu|status|ref|doc|tipe|type)/i.test(k)) {
      return null;
    }

    // Clean punctuation and spacing
    const clean = k.replace(/[^a-z0-9]/g, '');

    // Optional trailing 2-digit or 4-digit year, e.g. "Apr '25", "Apr-25", "Apr 2025" -> "apr25" / "apr2025"
    const YEAR_SUFFIX = '(\\d{2}|\\d{4})?';

    if (new RegExp(`^(apr|april)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln4|bulan4|month4|m04|p04|period04)$/i.test(clean)) return 'Apr';
    if (new RegExp(`^(may|mei)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln5|bulan5|month5|m05|p05|period05)$/i.test(clean)) return 'May';
    if (new RegExp(`^(jun|juni|june)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln6|bulan6|month6|m06|p06|period06)$/i.test(clean)) return 'Jun';
    if (new RegExp(`^(jul|juli|july)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln7|bulan7|month7|m07|p07|period07)$/i.test(clean)) return 'Jul';
    if (new RegExp(`^(aug|agu|ags|agustus|august)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln8|bulan8|month8|m08|p08|period08)$/i.test(clean)) return 'Aug';
    if (new RegExp(`^(sep|sept|september)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln9|bulan9|month9|m09|p09|period09)$/i.test(clean)) return 'Sep';
    if (new RegExp(`^(oct|okt|oktober|october)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln10|bulan10|month10|m10|p10|period10)$/i.test(clean)) return 'Oct';
    if (new RegExp(`^(nov|nop|november|nopember)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln11|bulan11|month11|m11|p11|period11)$/i.test(clean)) return 'Nov';
    if (new RegExp(`^(dec|des|desember|december)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln12|bulan12|month12|m12|p12|period12)$/i.test(clean)) return 'Dec';
    if (new RegExp(`^(jan|januari|january)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln1|bulan1|month1|m01|p01|period01)$/i.test(clean)) return 'Jan';
    if (new RegExp(`^(feb|februari|february)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln2|bulan2|month2|m02|p02|period02)$/i.test(clean)) return 'Feb';
    if (new RegExp(`^(mar|maret|march)${YEAR_SUFFIX}$`, 'i').test(clean) || /^(bln3|bulan3|month3|m03|p03|period03)$/i.test(clean)) return 'Mar';

    return null;
  };

  // Targeted annual budget amount extractor (handles "FY'26 Budget", "Fix Cost", "Budget", etc.)
  const findBudgetAnnualAmount = (row: Record<string, any>): any => {
    if (!row) return undefined;
    const rowKeys = Object.keys(row);

    // Priority 1: Specific FY26 budget column
    const fy26Candidates = [
      "fy'26 budget", 'fy26 budget', 'fy26budget', 'budget fy26', 'budget fy 26',
      'fy2026 budget', 'fy 2026 budget', 'fy 26 budget', 'fy26', 'fy 2026', 'fy2026',
      "fy'26", 'fy-26', 'fy_26', 'budget 2026', '2026 budget', 'anggaran 2026', 'pagu 2026',
      'fy26/27', 'fy2026/2027', 'fy 2026/2027', 'fy27', 'fy 27', 'budget fy27'
    ];
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      if (fy26Candidates.some(c => normalizeKey(c) === n)) {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }

    // Priority 2: Fix Cost / Anggaran / Proposed Budget / Target
    const fixCostCandidates = [
      'fix cost budget', 'budget fix cost', 'fix cost', 'fixcost', 'fixed cost',
      'annual budget', 'budget amount', 'amount budget', 'amount (budget)',
      'budget (amount)', 'total budget', 'budget',
      'anggaran tahunan', 'total anggaran', 'nilai anggaran', 'alokasi anggaran', 'anggaran',
      'pagu anggaran', 'pagu', 'rencana', 'plan', 'target', 'proposed', 'usulan', 'plafon'
    ];
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      if (n.includes('actual') || n.includes('forecast') || n.includes('variance') || n.includes('selisih')) continue;
      if (fixCostCandidates.some(c => normalizeKey(c) === n)) {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }

    // Priority 3: Prefer columns that identify both a budget and a monetary amount.
    // This handles headers such as "Amount (Budget)", "Budget Amount (USD)", etc.
    const budgetAmountKeys = rowKeys.filter((rk) => {
      const n = normalizeKey(rk);
      const isBudget = n.includes('budget') || n.includes('anggaran') || n.includes('fixcost') || n.includes('pagu');
      const isAmount = n.includes('amount') || n.includes('nominal') || n.includes('nilai') || n.includes('total') || n.includes('alokasi');
      const isComparison = n.includes('actual') || n.includes('forecast') || n.includes('variance') || n.includes('selisih');
      return isBudget && isAmount && !isComparison;
    });
    for (const rk of budgetAmountKeys) {
      if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
        return row[rk];
      }
    }

    // Priority 4: Column containing a budget marker as a fallback.
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      if (n.includes('actual') || n.includes('forecast') || n.includes('variance') || n.includes('selisih')) continue;
      if (n.includes('budget') || n.includes('anggaran') || n.includes('fixcost') || n.includes('pagu')) {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }

    // Priority 5: Generic amount/nominal/total/nilai/biaya
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      if (n.includes('actual') || n.includes('forecast') || n.includes('variance') || n.includes('selisih')) continue;
      if (n === 'amount' || n === 'nominal' || n === 'total' || n === 'nilai' || n === 'biaya' || n === 'idr' || n === 'usd' || n === 'jumlah') {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }

    // Last resort for exported reports whose header contains extra labels or line breaks.
    // Never use identity, date, status, or comparison columns as a budget amount.
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      const excluded = /coa|account|description|name|category|department|vendor|date|doc|ref|status|actual|forecast|variance|period|month|section|currency/.test(n);
      if (excluded) continue;
      const numericValue = parseCleanNumber(row[rk]);
      if (!isNaN(numericValue) && numericValue !== 0) {
        return row[rk];
      }
    }

    return undefined;
  };

  const findPriorActualAmount = (row: Record<string, any>): any => {
    if (!row) return undefined;
    const rowKeys = Object.keys(row);
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      if (n.includes('fy25actual') || n.includes("fy'25 actual") || n.includes('prioractual') || n.includes('actual2025') || (n.includes('actual') && (n.includes('25') || n.includes('prior') || n.includes('lalu')))) {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }
    return undefined;
  };

  const findForecastAmount = (row: Record<string, any>): any => {
    if (!row) return undefined;
    const rowKeys = Object.keys(row);
    for (const rk of rowKeys) {
      const n = normalizeKey(rk);
      if (n.includes('forecast') || n.includes('q3forecast') || n.includes('proyeksi')) {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }
    return undefined;
  };

  // Flexible column finder: searches for aliases safely without false-positive cross matching
  const getField = (row: Record<string, any>, possibleKeys: string[]): any => {
    if (!row) return undefined;
    const rowKeys = Object.keys(row);
    const normalizedPossibles = possibleKeys.map(normalizeKey);
    
    // 1. Exact normalized key match (highest priority)
    for (const rk of rowKeys) {
      const nRk = normalizeKey(rk);
      if (normalizedPossibles.includes(nRk)) {
        if (row[rk] !== undefined && row[rk] !== null && row[rk] !== '') {
          return row[rk];
        }
      }
    }

    // 2. Substring match (require token length >= 4 to prevent short collisions)
    for (const rk of rowKeys) {
      const nRk = normalizeKey(rk);
      for (const p of normalizedPossibles) {
        if (p.length >= 4 && nRk.includes(p)) {
          if (row[rk] !== undefined && row[rk] !== null && row[rk] !== '') {
            return row[rk];
          }
        }
      }
    }

    return undefined;
  };

  // Helper to parse numbers safely (handles IDR dots, commas, accounting parentheses, dashes, currency strings, scientific notation)
  const parseCleanNumber = (val: any): number => {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') {
      return isNaN(val) ? NaN : val;
    }
    
    let str = String(val).trim();
    // Replace non-breaking spaces (\u00A0) and whitespace tabs
    str = str.replace(/[\s\u00A0]+/g, ' ').trim();
    
    // Blank, dash, or zero strings commonly used in accounting reports for 0
    if (!str || /^[-–—\s]+$/.test(str) || str === '0.00' || str === '0,00' || str === '0' || /^#?(N\/A|VALUE!|REF!|NUM!|NA)$/i.test(str)) {
      return 0;
    }

    // Accounting format with parentheses: e.g. (368,594) or (114.983) or ($ 368,594) -> negative number
    let isNegative = false;
    if (/^\(.*\)$/.test(str)) {
      isNegative = true;
      str = str.slice(1, -1).trim();
    } else if (str.startsWith('-') || str.startsWith('–') || str.startsWith('—')) {
      isNegative = true;
      str = str.replace(/^[-–—]\s*/, '');
    }

    // Strip currency symbols and prefixes/suffixes: Rp, IDR, USD, $, EUR, €, GBP, £, JPY, ¥
    str = str.replace(/^(Rp\.?|IDR|USD|\$|EUR|€|GBP|£|JPY|¥)\s*/i, '');
    str = str.replace(/\s*(Rp\.?|IDR|USD|\$|EUR|€|GBP|£|JPY|¥)$/i, '');
    str = str.trim();

    if (!str || /^[-–—\s]+$/.test(str)) {
      return 0;
    }

    // Scientific notation e.g. -1.13986E-06 or 2.5E4
    if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
      const num = Number(str);
      return isNegative ? -Math.abs(num) : num;
    }

    // Indonesian thousands dots with comma decimal (e.g. 1.250.000,50 or 1.250.000)
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
      str = str.replace(/\./g, '').replace(',', '.');
    } 
    // US format with comma thousands (e.g. 1,250,000.50 or 1,675,548 or 60,582)
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
      str = str.replace(/,/g, '');
    } 
    // Simple comma decimal (e.g. 125,50)
    else if (/^\d+,\d+$/.test(str)) {
      str = str.replace(',', '.');
    }
    // Loose thousands with commas (e.g. 12,345,678)
    else if (/^\d+(,\d+)+$/.test(str)) {
      str = str.replace(/,/g, '');
    }

    const res = Number(str);
    if (isNaN(res)) return NaN;
    return isNegative ? -Math.abs(res) : res;
  };

  // Helper to parse Excel dates (serial numbers or strings)
  const parseExcelDate = (val: any): string => {
    if (!val) return '2026-08-28';
    if (typeof val === 'number') {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      } catch {}
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }
    const parts = str.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return str;
  };

  // Month-name lookup (EN + ID aliases) used to parse a "Period/Month" cell or column
  const MONTH_ALIASES: Record<string, FiscalMonth> = {
    jan: 'Jan', january: 'Jan', januari: 'Jan',
    feb: 'Feb', february: 'Feb', februari: 'Feb',
    mar: 'Mar', march: 'Mar', maret: 'Mar',
    apr: 'Apr', april: 'Apr',
    may: 'May', mei: 'May',
    jun: 'Jun', june: 'Jun', juni: 'Jun',
    jul: 'Jul', july: 'Jul', juli: 'Jul',
    aug: 'Aug', august: 'Aug', agustus: 'Aug', agu: 'Aug', ags: 'Aug', agt: 'Aug',
    sep: 'Sep', sept: 'Sep', september: 'Sep',
    oct: 'Oct', october: 'Oct', okt: 'Oct', oktober: 'Oct',
    nov: 'Nov', november: 'Nov',
    dec: 'Dec', december: 'Dec', des: 'Dec', desember: 'Dec'
  };

  // Parses a single "Period/Month" cell (e.g. "Apr 2026", "04/2026", "Mei", etc.)
  const parseFiscalPeriod = (val: any): FiscalMonth | undefined => {
    if (val === null || val === undefined || val === '') return undefined;

    if (typeof val === 'number') {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          const key = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
          if (MONTH_ALIASES[key]) return MONTH_ALIASES[key];
        }
      } catch {}
    }

    const str = String(val).trim().toLowerCase();

    const nameMatch = str.match(/[a-z]{3,}/);
    if (nameMatch) {
      const token = nameMatch[0];
      if (MONTH_ALIASES[token]) return MONTH_ALIASES[token];
      const prefix3 = token.slice(0, 3);
      if (MONTH_ALIASES[prefix3]) return MONTH_ALIASES[prefix3];
    }

    // Numeric month, e.g. "04/2026", "2026-04", or a bare "4"
    const numMatch = str.match(/(?:^|[^0-9])(0?[1-9]|1[0-2])(?:[^0-9]|$)/);
    if (numMatch) {
      const monthNamesByNum: FiscalMonth[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNamesByNum[parseInt(numMatch[1], 10) - 1];
    }

    return undefined;
  };

  // Check if a row is a non-data row (subtotal, category header, blank, footnote, etc.)
  // This satisfies the critical requirement: administrators do not need to manually clean/filter Excel.
  const classifyNonDataRow = (
    row: Record<string, any>, 
    coaKey?: string,
    hasCoaColumn: boolean = true,
    isBudgetUpload: boolean = false
  ): { isData: boolean; reason?: string; snippet?: string } => {
    const entries = Object.entries(row).filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== '');
    
    // 1. Completely blank row
    if (entries.length === 0) {
      return { isData: false, reason: 'Baris Kosong (Blank Row)', snippet: '(semua sel kosong)' };
    }

    const values = entries.map(([_, v]) => v);
    const allText = values.map(v => String(v)).join(' ').toLowerCase();

    // 2. Signature block or Footnotes / Notes (always discard regardless of file type)
    const footnoteKeywords = [
      'disetujui oleh', 'dibuat oleh', 'mengetahui', 'approved by', 'prepared by', 
      'checked by', 'catatan:', 'note:', 'keterangan:', 'page ', 'halaman '
    ];
    for (const kw of footnoteKeywords) {
      if (allText.includes(kw)) {
        return { 
          isData: false, 
          reason: 'Catatan Kaki / Kolom Persetujuan', 
          snippet: values.slice(0, 2).map(String).join(' | ') 
        };
      }
    }

    // CRITICAL: When the uploaded file has NO COA column at all:
    // Do NOT discard data rows as non-data! The user needs them to be processed so they are listed under "Rejected Format Issues"
    if (!hasCoaColumn) {
      const isPureGrandTotal = allText.startsWith('grand total') || allText.startsWith('total keseluruhan') || allText.includes('grand total fix cost');
      if (isPureGrandTotal) {
        return { 
          isData: false, 
          reason: 'Baris Ringkasan / Grand Total', 
          snippet: values.slice(0, 3).map(String).join(' | ') 
        };
      }
      // Treat every non-blank row as a data row that has format issues (missing COA)
      return { isData: true };
    }
    
    // Resolve COA code
    let coaVal = '';
    if (coaKey && row[coaKey] !== undefined) {
      coaVal = String(row[coaKey] || '').trim();
    } else {
      const detectedKey = findCoaKey(row);
      if (detectedKey && row[detectedKey] !== undefined) {
        coaVal = String(row[detectedKey] || '').trim();
      }
    }
    
    // Check if COA is a valid numeric or standard format account code
    const hasValidCoaCode = /^\d{5,9}$|^IT-\d{5}$/i.test(coaVal);

    // Description text check
    const rawDesc = String(
      getField(row, [
        'description', 'account description', 'account name', 'account_name', 
        'nama akun', 'deskripsi', 'deskripsi akun', 'uraian', 'uraian akun', 
        'nama perkiraan', 'keterangan', 'pos beban', 'pos biaya', 'item', 'rincian'
      ]) || ''
    ).trim();
    const descLower = rawDesc.toLowerCase();

    // Collect all text tokens in row
    const textValues = values
      .filter(v => typeof v === 'string' && isNaN(Number(v)))
      .map(v => String(v).trim().toLowerCase());

    // 3. Subtotal or Total row (e.g. "TOTAL DIRECT LABOR", "TOTAL SGA LABOR", "TOTAL FIX COST", "GRAND TOTAL", "Jumlah")
    const isTotalRow = 
      descLower.startsWith('total') || 
      descLower.startsWith('subtotal') || 
      descLower.startsWith('sub total') || 
      descLower.startsWith('grand total') || 
      descLower.startsWith('jumlah') || 
      descLower.includes('total direct') || 
      descLower.includes('total indirect') || 
      descLower.includes('total sga') || 
      descLower.includes('total fix cost') || 
      descLower.includes('total other') || 
      descLower.includes('grand total fix cost') ||
      allText.includes('grand total') || 
      allText.includes('total keseluruhan') || 
      allText.includes('rekapitulasi') ||
      textValues.some(t => 
        t === 'total' || 
        t === 'subtotal' || 
        t === 'sub total' || 
        t === 'jumlah' || 
        t === 'grand total' ||
        t.startsWith('total ') || 
        t.startsWith('subtotal ') || 
        t.startsWith('sub total ') || 
        t.startsWith('grand total ') || 
        t.startsWith('jumlah ')
      );

    if (isTotalRow && !hasValidCoaCode) {
      return { 
        isData: false, 
        reason: `Baris Ringkasan / Subtotal (${rawDesc || textValues[0] || 'Total'})`, 
        snippet: values.slice(0, 3).map(String).join(' | ') 
      };
    }

    // 4. Budget Template: Unbudgeted template row or inactive row without COA code and with 0/empty budget
    if (isBudgetUpload && !hasValidCoaCode) {
      const budgetValRaw = findBudgetAnnualAmount(row);
      const budgetNum = budgetValRaw !== undefined ? parseCleanNumber(budgetValRaw) : NaN;
      const hasAnnualBudget = !isNaN(budgetNum) && budgetNum !== 0;

      // Also check if any monthly columns have non-zero budget
      const hasMonthlyBudget = FISCAL_MONTHS.some(m => {
        const val = getField(row, [m, m.toLowerCase(), `month_${m}`]);
        if (val !== undefined) {
          const n = parseCleanNumber(val);
          return !isNaN(n) && n !== 0;
        }
        return false;
      });

      // If there is NO budget allocated for FY26 (budget is 0, '-', or empty), this is an unbudgeted template item
      if (!hasAnnualBudget && !hasMonthlyBudget) {
        return {
          isData: false,
          reason: `Baris Template Nir-Anggaran (Tanpa COA & Budget FY26 = 0: ${rawDesc || 'Unbudgeted'})`,
          snippet: values.slice(0, 4).map(String).join(' | ')
        };
      }
    }

    // 5. GL Upload: Inactive template line with no valid COA code and 0 / NaN actual amount
    if (!isBudgetUpload && !hasValidCoaCode) {
      const explicitAmountRaw = getField(row, [
        'actual amount in loc.curr.', 'actual amount in doc.curr.',
        'nominal actual amount', 'nominal', 'actual amount', 'actual_amount',
        'amount', 'nilai', 'actual', 'total'
      ]);
      const debitVal = getField(row, ['debits', 'debit', 'dr']);
      const creditVal = getField(row, ['credits', 'credit', 'cr']);
      
      let glAmount = NaN;
      if (explicitAmountRaw !== undefined && explicitAmountRaw !== '') {
        glAmount = parseCleanNumber(explicitAmountRaw);
      } else if (debitVal !== undefined || creditVal !== undefined) {
        const deb = parseCleanNumber(debitVal) || 0;
        const cred = parseCleanNumber(creditVal) || 0;
        glAmount = deb - cred;
      }

      if (isNaN(glAmount) || glAmount === 0) {
        return {
          isData: false,
          reason: `Baris Template / Spacer (Tanpa COA & Nominal Actual = 0: ${rawDesc || 'Zero Amount'})`,
          snippet: values.slice(0, 4).map(String).join(' | ')
        };
      }
    }

    // 6. Section Banner / Header without amounts and without valid COA (e.g. "DIRECT LABOR", "SGA LABOR", "OTHER SGA FIX EXPENSES")
    if (!hasValidCoaCode) {
      // Find valid non-zero numeric amounts
      const numericAmounts = values.filter(v => {
        const num = parseCleanNumber(v);
        return !isNaN(num) && num !== 0;
      });

      // If no valid non-zero amounts exist, this is a category / section banner
      if (numericAmounts.length === 0) {
        return { 
          isData: false, 
          reason: `Judul Seksi / Banner Kategori (${rawDesc || values[0]})`, 
          snippet: values.join(' | ') 
        };
      }

      // If only 1-2 text cells populated without COA code AND without any amounts
      if (values.length <= 2 && (!coaVal || coaVal === '-') && numericAmounts.length === 0) {
        return { 
          isData: false, 
          reason: `Judul Seksi / Header (${rawDesc || values[0]})`, 
          snippet: values.join(' | ') 
        };
      }
    }

    // 7. Percentage or Ratio only row (e.g. row with "1.94%", "-0.14%" or small decimals without COA)
    const isRatioOrPercentageRow = values.length > 0 && values.every(v => {
      if (typeof v === 'string' && (v.includes('%') || /^[+-]?\d+(\.\d+)?%$/.test(v.trim()))) return true;
      if (typeof v === 'number' && v > -1 && v < 1 && v !== 0) return true;
      return false;
    });
    if (isRatioOrPercentageRow && !hasValidCoaCode) {
      return { 
        isData: false, 
        reason: 'Baris Rasio / Persentase', 
        snippet: values.slice(0, 3).map(String).join(' | ') 
      };
    }

    // 8. Row without any COA and without any account description
    if (!coaVal && !rawDesc) {
      const meaningfulText = textValues.filter(t => t.length > 1 && !['-', '--', 'n/a', '0', 'null', 'undefined'].includes(t));
      if (meaningfulText.length === 0) {
        return { 
          isData: false, 
          reason: 'Baris Kosong / Spacer Tanpa Akun', 
          snippet: values.slice(0, 3).map(String).join(' | ') 
        };
      }
    }

    // 9. Explicitly Out-of-Scope Non-IT Department (if raw export contains multiple corporate departments)
    const deptVal = String(getField(row, ['department', 'departemen', 'divisi']) || '').toLowerCase();
    if (deptVal && (deptVal.includes('production') || deptVal.includes('general affair') || deptVal.includes('human resource') || deptVal.includes('ga dept'))) {
      return { 
        isData: false, 
        reason: `Di Luar Scope MIS / IT (${deptVal})`, 
        snippet: values.slice(0, 3).map(String).join(' | ') 
      };
    }

    return { isData: true };
  };

  // Normalizes COA candidate string and matches against Master COAs with maximum resilience
  const normalizeAndMatchCoa = (
    rawAccountStr: string,
    rawAccountName: string,
    validCoaMap: Map<string, CoaItem>,
    coaByNameMap: Map<string, CoaItem>
  ): { 
    cleanCode: string; 
    accountPattern?: string; 
    sectionCode?: string; 
    matchedCoa?: CoaItem;
    matchedByName?: boolean;
  } => {
    let cleanCode = String(rawAccountStr || '').trim();
    let accountPattern: string | undefined = undefined;
    let sectionCode: string | undefined = undefined;

    // 1. Clean Excel numeric artifacts (e.g. 752201001.0 -> 752201001)
    if (cleanCode.endsWith('.0')) {
      cleanCode = cleanCode.slice(0, -2);
    }
    cleanCode = cleanCode.replace(/^['"`\s]+|['"`\s]+$/g, '');

    // 2. Check if COA cell contains both code and description (e.g. "752201001 - Communication Line" or "[752201001] Line")
    const combinedMatch = cleanCode.match(/\b(IT-\d{5}|\d{9}|\d{5})\b/i);
    if (combinedMatch && cleanCode.length > combinedMatch[0].length + 2) {
      cleanCode = combinedMatch[0];
    }

    // 3. Handle hyphenated / SAP ledger format (e.g. 752201001-A7744-ME0000 or IT-60101)
    if (cleanCode.includes('-')) {
      if (/^IT-\d{5}/i.test(cleanCode)) {
        cleanCode = cleanCode.toUpperCase();
      } else {
        const parts = cleanCode.split('-');
        cleanCode = parts[0].trim();
        accountPattern = rawAccountStr.trim();
        if (parts.length >= 3) {
          sectionCode = parts[2].trim();
        }
      }
    } 
    // 4. Handle formatted 9-digit codes with dots or spaces (e.g. "7522.01.001" or "7522 01 001")
    else if (/^\d{4}[\.\s]\d{2}[\.\s]\d{3}$/.test(cleanCode)) {
      cleanCode = cleanCode.replace(/[\.\s]/g, '');
    }
    // 5. Handle bare 5-digit number that maps to IT-60xxx (e.g. "60101" -> "IT-60101")
    else if (/^\d{5}$/.test(cleanCode)) {
      const itCandidate = `IT-${cleanCode}`;
      if (validCoaMap.has(itCandidate.toUpperCase())) {
        cleanCode = itCandidate;
      }
    }
    // 6. Handle "IT60101" or "IT 60101"
    else if (/^IT\s*\d{5}$/i.test(cleanCode)) {
      cleanCode = `IT-${cleanCode.replace(/[^0-9]/g, '')}`;
    }

    if (cleanCode && !accountPattern) {
      accountPattern = `${cleanCode}-A7744-*`;
    }

    // Lookup in Master COAs
    let matchedCoa: CoaItem | undefined = undefined;
    let matchedByName = false;
    if (cleanCode) {
      matchedCoa = validCoaMap.get(cleanCode.toUpperCase()) || 
        (accountPattern ? validCoaMap.get(accountPattern.toUpperCase()) : undefined);
    }

    // Secondary match: if cleanCode is empty or not in Master COA, try matching by account description / name
    if (!matchedCoa && rawAccountName) {
      const normName = rawAccountName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName) {
        const matchByName = coaByNameMap.get(normName);
        if (matchByName) {
          matchedCoa = matchByName;
          cleanCode = matchByName.code;
          accountPattern = matchByName.accountPattern || `${cleanCode}-A7744-*`;
          sectionCode = matchByName.sectionCode;
          matchedByName = true;
        }
      }
    }

    return {
      cleanCode,
      accountPattern,
      sectionCode,
      matchedCoa,
      matchedByName
    };
  };

  // Detects and consolidates "long format" Budget uploads
  const consolidateLongFormatBudget = (rawJson: any[]): any[] | null => {
    if (!rawJson.length) return null;

    // Scan first 15 rows to find a valid sample with non-empty fields
    let sample: any = null;
    for (let i = 0; i < Math.min(rawJson.length, 15); i++) {
      if (rawJson[i] && Object.keys(rawJson[i]).length >= 3) {
        sample = rawJson[i];
        break;
      }
    }
    if (!sample) return null;

    const hasPeriodCol = getField(sample, ['period/month', 'period', 'periode', 'bulan', 'month', 'waktu']) !== undefined;
    const budgetAmountAliases = [
      'budget amount', 'budget_amount', 'amount budget', 'amount (budget)',
      'nominal budget', 'nominal (budget)', 'nominal', 'amount', 'anggaran', 'nilai'
    ];
    const hasAmountCol = getField(sample, budgetAmountAliases) !== undefined;
    
    // Check if wide month columns already exist
    const hasWideMonthCols = FISCAL_MONTHS.some((m) => getField(sample, [m, m.toLowerCase(), `month_${m}`]) !== undefined);

    if (!hasPeriodCol || !hasAmountCol || hasWideMonthCols) return null;

    type Group = {
      coa: string;
      accountName: string;
      category: string;
      department: string;
      monthly: Partial<Record<FiscalMonth, number>>;
      periodErrors: string[];
    };
    const grouped = new Map<string, Group>();

    rawJson.forEach((row) => {
      const coaKey = findCoaKey(row);
      const rawCoa = coaKey ? String(row[coaKey] || '') : String(getField(row, COA_PRIMARY_ALIASES) || '');
      const coa = rawCoa.trim();
      if (!coa) return;

      // Skip subtotal or non-data rows inside long format
      const nonDataCheck = classifyNonDataRow(row, coaKey);
      if (!nonDataCheck.isData) return;

      const coaKeyUpper = coa.toUpperCase();
      if (!grouped.has(coaKeyUpper)) {
        grouped.set(coaKeyUpper, {
          coa,
          accountName: String(getField(row, ['account description', 'description', 'nama akun', 'account name']) || ''),
          category: String(getField(row, ['category', 'kategori']) || ''),
          department: String(getField(row, ['department', 'departemen', 'divisi']) || ''),
          monthly: {},
          periodErrors: []
        });
      }
      const g = grouped.get(coaKeyUpper)!;

      const periodRaw = getField(row, ['period/month', 'period', 'periode', 'bulan', 'month', 'waktu']);
      const fm = parseFiscalPeriod(periodRaw);
      const amtRaw = getField(row, budgetAmountAliases);
      const amt = parseCleanNumber(amtRaw);

      if (!fm) {
        g.periodErrors.push(String(periodRaw ?? '(kosong)'));
        return;
      }
      g.monthly[fm] = (g.monthly[fm] || 0) + (isNaN(amt) ? 0 : amt);
    });

    if (grouped.size === 0) return null;

    return Array.from(grouped.values()).map((g) => {
      const out: any = {
        'Account Number': g.coa,
        'Account Description': g.accountName,
        'Category': g.category,
        'Department': g.department
      };
      FISCAL_MONTHS.forEach((m) => {
        out[m] = g.monthly[m] ?? 0;
      });
      if (g.periodErrors.length) {
        out.__PeriodParseErrors = g.periodErrors;
      }
      return out;
    });
  };

  // Infer category from text or account description
  const inferCategory = (rawCat: string, accountName: string): CoaCategory => {
    const c = (rawCat || '').toLowerCase().trim();
    const n = (accountName || '').toLowerCase();
    
    if (c.includes('software') || n.includes('license') || n.includes('software') || n.includes('saas') || n.includes('cloud') || n.includes('subscription')) return 'Software';
    if (c.includes('hardware') || n.includes('hardware') || n.includes('laptop') || n.includes('server') || n.includes('rental expense') || n.includes('office equipment') || n.includes('supply')) return 'Hardware';
    if (c.includes('network') || n.includes('communication') || n.includes('internet') || n.includes('bandwidth') || n.includes('telecom') || n.includes('telkom')) return 'Network';
    if (c.includes('consulting') || n.includes('subcontract') || n.includes('consulting') || n.includes('professional') || n.includes('audit')) return 'Consulting';
    if (c.includes('maintenance') || n.includes('repair') || n.includes('maintenance') || n.includes('service') || n.includes('utility')) return 'Maintenance';
    if (c.includes('training') || n.includes('training') || n.includes('certification') || n.includes('travel')) return 'Training';
    if (c.includes('sga') || n.includes('sga')) return 'SGA';
    if (c.includes('direct') && !c.includes('indirect')) return 'Direct';
    if (c.includes('indirect') || n.includes('indirect') || n.includes('salary') || n.includes('bonus') || n.includes('thr')) return 'Indirect';
    if (n.includes('fx') || n.includes('foreign exchange') || n.includes('reval')) return 'Finance & FX';
    return 'Operational';
  };

  // Generate and download sample template with active COAs
  const handleDownloadTemplate = () => {
    let sheetData: any[] = [];
    if (uploadType === 'Monthly GL') {
      sheetData = coaList.map((c, i) => ({
        'Account Number': c.accountPattern || `${c.code}-A7744-ME0000`,
        'COA_CODE': c.code,
        'Account Description': c.accountName,
        'Nominal (Actual Amount)': 120_000_000 + i * 15_000_000,
        'Doc. Number': `DOC-020292-${String(i + 101).padStart(5, '0')}`,
        'Posting Date': '2026-08-28',
        'Vendor': i % 3 === 0 ? 'PT. INDOSAT TBK' : i % 2 === 0 ? 'PT. TELKOM INDONESIA' : 'Direct Vendor',
        'Reference': `SAP-BATCH-${i + 101}`,
        'Section Code': c.sectionCode || 'ME0000',
        'Category': c.category,
        'Comment': `Reconciled actuals for ${c.accountName}`
      }));
    } else {
      // Annual Budget: All registered COAs
      sheetData = coaList.map((c) => {
        const item: any = {
          'Account Number': c.code,
          'Account Description': c.accountName,
          'Category': c.category
        };
        FISCAL_MONTHS.forEach((m) => {
          item[m] = 125_000_000;
        });
        return item;
      });
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Actual_GL_Data');
    XLSX.writeFile(wb, `SAP_Actual_GL_${uploadType.replace(' ', '_')}.xlsx`);
  };

  // Validate raw data rows with automatic filtering of non-data rows and resilient COA matching
  const validateUploadedData = (
    rawJson: any[],
    overrideType?: UploadType
  ): { 
    rows: ParsedRow[]; 
    newCoas: CoaItem[];
    filteredRows: FilteredRowInfo[];
    hasCoaColumn: boolean;
  } => {
    const currentUploadType = overrideType || uploadType;

    // Build quick lookup map for existing Master COAs (by code, pattern, and name)
    const validCoaMap = new Map<string, CoaItem>();
    const coaByNameMap = new Map<string, CoaItem>();

    coaList.forEach(c => {
      validCoaMap.set(c.code.toUpperCase(), c);
      if (c.accountPattern) {
        validCoaMap.set(c.accountPattern.toUpperCase(), c);
      }
      const normName = c.accountName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName) {
        coaByNameMap.set(normName, c);
      }
    });

    const localNewCoasMap = new Map<string, CoaItem>();
    const seenBudgetCodes = new Set<string>();
    const detectedFilteredRows: FilteredRowInfo[] = [];

    // Check if long format budget consolidation applies
    const consolidated = currentUploadType === 'Budget' ? consolidateLongFormatBudget(rawJson) : null;
    const effectiveRawJson = consolidated ?? rawJson;

    // Detect primary COA column from the dataset across sample rows
    let primaryCoaKey: string | undefined = undefined;
    for (let i = 0; i < Math.min(effectiveRawJson.length, 15); i++) {
      primaryCoaKey = findCoaKey(effectiveRawJson[i] || {}, effectiveRawJson.slice(0, 10));
      if (primaryCoaKey) break;
    }
    const hasCoaColumn = Boolean(primaryCoaKey);

    const rows: ParsedRow[] = [];
    let lastValidCoaCode = '';
    const isBudgetUpload = currentUploadType === 'Budget';

    effectiveRawJson.forEach((row, index) => {
      const rowNum = Number(row.__EXCEL_ROW__) || (index + 2); // true Excel row number

      // Filter non-data rows automatically (subtotals, grand totals, category banners, blank lines, unbudgeted template lines)
      const classification = classifyNonDataRow(row, primaryCoaKey, hasCoaColumn, isBudgetUpload);
      if (!classification.isData) {
        detectedFilteredRows.push({
          rowNum,
          reason: classification.reason || 'Baris Non-Data Dikecualikan',
          snippet: classification.snippet || ''
        });
        return; // Skip non-data row automatically!
      }

      const errors: string[] = [];

      // Extract account number / COA code
      const coaKeyToUse = primaryCoaKey || findCoaKey(row);
      const rawAccountStr = String(
        (coaKeyToUse ? row[coaKeyToUse] : undefined) ||
        getField(row, COA_PRIMARY_ALIASES) || ''
      ).trim();

      // Extract account name/description
      let rawAccountName = String(
        getField(row, [
          'account description', 'account_name', 'account name', 'nama akun',
          'deskripsi', 'deskripsi akun', 'nama perkiraan', 'uraian', 'uraian akun',
          'description', 'comment', 'comment 2', 'keterangan', 'item', 'nama', 'barang'
        ]) || ''
      ).trim();

      if (!rawAccountName && !hasCoaColumn) {
        const nonBlank = Object.values(row).find(v => v !== null && v !== undefined && String(v).trim() !== '' && isNaN(Number(v)));
        if (nonBlank) rawAccountName = String(nonBlank).trim();
      }

      // Normalize and match COA
      const coaMatch = normalizeAndMatchCoa(rawAccountStr, rawAccountName, validCoaMap, coaByNameMap);
      let cleanCode = coaMatch.cleanCode;
      const accountNumberPattern = coaMatch.accountPattern;
      const sectionCode = coaMatch.sectionCode;
      let matchedCoa = coaMatch.matchedCoa;

      // Extract document number
      const docNo = String(
        getField(row, [
          'doc number', 'doc. number', 'doc no', 'gl_document_no', 'gl document no',
          'document number', 'reference', 'batch entry', 'fp number', 'no dokumen'
        ]) || `DOC-SAP-${rowNum}`
      ).trim();

      // Extract vendor
      const vendor = String(
        getField(row, ['vendor', 'vendor name', 'supplier', 'party', 'entity', 'rekanan']) || ''
      ).trim();

      // Extract reference
      const reference = String(
        getField(row, ['reference', 'ref', 'batch-entry', 'fp number', 'no ref']) || ''
      ).trim();

      // Extract date
      const rawDate = getField(row, ['date', 'posting date', 'posting_date', 'tanggal']);
      const postingDate = parseExcelDate(rawDate);

      // Extract category & department
      const rowCategory = String(getField(row, ['category', 'kategori', 'pd']) || '').trim();
      const rowDepartment = String(getField(row, ['department', 'departemen', 'divisi']) || '').trim();
      const currency = String(getField(row, ['curr', 'currency', 'mata uang']) || 'USD').trim();

      // MIS/IT scope check based on the section code embedded directly in the SAP GL
      // Account Number (e.g. "980302000-A7744-COMM00" -> section "COMM00"), since this
      // raw SAP export format has no separate "Department" column to read from.
      const MIS_SECTION_CODES = ['MIS000'];
      const isOutOfMisScopeBySection = !!sectionCode && !MIS_SECTION_CODES.includes(sectionCode.toUpperCase());

      let amount = 0;
      let monthlyRecord: Record<FiscalMonth, number> | undefined;
      let priorActual: number | undefined;
      let forecast: number | undefined;
      let isConsolidatedRow = false;

      if (currentUploadType === 'Monthly GL') {
        const explicitAmountRaw = getField(row, [
          'nominal actual amount', 'nominal', 'actual amount', 'actual_amount',
          'amount', 'nilai', 'actual', 'total'
        ]);

        if (explicitAmountRaw !== undefined && explicitAmountRaw !== '') {
          amount = parseCleanNumber(explicitAmountRaw);
        } else {
          // Check Debits & Credits columns from SAP reports
          const debitVal = getField(row, ['debits', 'debit', 'dr']);
          const creditVal = getField(row, ['credits', 'credit', 'cr']);
          if (debitVal !== undefined || creditVal !== undefined) {
            const deb = parseCleanNumber(debitVal) || 0;
            const cred = parseCleanNumber(creditVal) || 0;
            amount = deb - cred;
          }
        }

        if (isNaN(amount)) {
          errors.push('Rejected Format Issue: Nilai nominal tidak dapat dibaca dari baris data');
        }

        if (rowDepartment && /needs confirmation/i.test(rowDepartment)) {
          errors.push(`Rejected Format Issue: Baris di luar scope MIS/IT (${rowDepartment}) — tidak dimasukkan sebagai Actual GL`);
        } else if (isOutOfMisScopeBySection) {
          errors.push(`Rejected Format Issue: Baris di luar scope MIS/IT (Section: ${sectionCode}) — tidak dimasukkan sebagai Actual GL`);
        }
      } else {
        // Budget template: detect if table has dedicated multi-month columns or single annual budget column
        monthlyRecord = {} as any;
        let sum = 0;

        // Detect month columns strictly (rejects 'description', 'remarks', etc.)
        const rowKeys = Object.keys(row);
        const rowMonthMap: Partial<Record<FiscalMonth, string>> = {};
        rowKeys.forEach((rk) => {
          const m = matchFiscalMonthColumn(rk);
          if (m && !rowMonthMap[m]) {
            rowMonthMap[m] = rk;
          }
        });

        const hasMultiMonthCols = Object.keys(rowMonthMap).length >= 3;

        if (hasMultiMonthCols) {
          // Dedicated monthly columns template
          FISCAL_MONTHS.forEach((m) => {
            const colKey = rowMonthMap[m];
            if (colKey && row[colKey] !== undefined && row[colKey] !== null && String(row[colKey]).trim() !== '') {
              const mVal = parseCleanNumber(row[colKey]);
              if (isNaN(mVal)) {
                errors.push(`Rejected Format Issue: Nominal bulan ${m} tidak valid: "${row[colKey]}"`);
              } else {
                (monthlyRecord as any)[m] = mVal;
                sum += mVal;
              }
            } else {
              (monthlyRecord as any)[m] = 0;
            }
          });
        } else {
          // Single-column annual budget template (e.g. "FY'26 Budget", "Fix Cost", "Budget", "Total Anggaran")
          const annualRaw = findBudgetAnnualAmount(row);

          if (annualRaw !== undefined && annualRaw !== null && String(annualRaw).trim() !== '') {
            const annualVal = parseCleanNumber(annualRaw);
            if (!isNaN(annualVal)) {
              const perMonth = Math.round(annualVal / 12);
              FISCAL_MONTHS.forEach((m) => {
                (monthlyRecord as any)[m] = perMonth;
              });
              sum = annualVal;
            } else {
              errors.push(`Rejected Format Issue: Format angka budget tidak valid: "${annualRaw}"`);
            }
          } else {
            // If row has account code/name but budget amount is empty/blank/dash, treat as 0
            if (cleanCode || rawAccountName) {
              FISCAL_MONTHS.forEach((m) => {
                (monthlyRecord as any)[m] = 0;
              });
              sum = 0;
            } else {
              errors.push('Rejected Format Issue: Kolom alokasi bulan anggaran (Apr - Mar) atau total anggaran tidak ditemukan');
            }
          }
        }

        // Extract benchmark / comparison values if present (e.g. FY'25 Actual, FY'25 Forecast)
        const priorActualRaw = findPriorActualAmount(row);
        const priorActualVal = priorActualRaw !== undefined ? parseCleanNumber(priorActualRaw) : undefined;
        priorActual = priorActualVal !== undefined && !isNaN(priorActualVal) ? priorActualVal : undefined;

        const forecastRaw = findForecastAmount(row);
        const forecastVal = forecastRaw !== undefined ? parseCleanNumber(forecastRaw) : undefined;
        forecast = forecastVal !== undefined && !isNaN(forecastVal) ? forecastVal : undefined;

        amount = sum;

        if (Array.isArray((row as any).__PeriodParseErrors) && (row as any).__PeriodParseErrors.length) {
          errors.push(
            `Nilai "Period/Month" tidak dikenali untuk ${(row as any).__PeriodParseErrors.length} baris sumber (COA ${cleanCode}): ${(row as any).__PeriodParseErrors.slice(0, 3).join(', ')}${(row as any).__PeriodParseErrors.length > 3 ? ', ...' : ''}`
          );
        }

        if (cleanCode) {
          const codeUpper = cleanCode.toUpperCase();
          if (seenBudgetCodes.has(codeUpper)) {
            // Note: multiple line items share this COA (e.g. sub-allocations in Fix Cost sheet)
            // Consolidated upon commit instead of blocking with fatal error
            isConsolidatedRow = true;
          } else {
            seenBudgetCodes.add(codeUpper);
          }
        }
      }

      // Budget uploads are scoped to the registered Master COA list. Ignore
      // corporate accounts, subtotal lines, and other source rows outside MIS.
      // They are filtered out instead of becoming rejected rows in the wizard.
      if (isBudgetUpload && !matchedCoa) {
        detectedFilteredRows.push({
          rowNum,
          reason: 'Di luar scope Master COA MIS / bukan akun anggaran yang terdaftar',
          snippet: `${rawAccountStr || '(tanpa COA)'} | ${rawAccountName || '(tanpa uraian)'}`
        });
        return;
      }

      // Safeguard for Budget Uploads: If row has no COA and budget amount is 0, filter it out as unbudgeted template line
      if (isBudgetUpload && !cleanCode && amount === 0) {
        detectedFilteredRows.push({
          rowNum,
          reason: `Baris Template Nir-Anggaran (Tanpa COA & Budget FY26 = 0: ${rawAccountName || 'Unbudgeted'})`,
          snippet: `Desc: ${rawAccountName || '-'} | Budget: 0`
        });
        return;
      }

      if (!hasCoaColumn && !isBudgetUpload) {
        errors.push('Rejected Format Issue: Kolom Kode COA (Account Number) tidak ditemukan pada file Excel');
      } else if (!cleanCode && !isBudgetUpload) {
        errors.push(
          amount > 0 
            ? `Rejected Format Issue: Baris memiliki alokasi anggaran (${amount.toLocaleString()}) namun kolom/kode COA tidak terisi`
            : 'Rejected Format Issue: Kolom/Kode COA tidak terisi pada baris data'
        );
      } else if (!cleanCode && isBudgetUpload) {
        // Keep budget-only allocation rows visible even when the source has no COA.
        // The synthetic key preserves each value during consolidation and commit.
        cleanCode = `UNMAPPED-BUDGET-${rowNum}`;
      } else {
        lastValidCoaCode = cleanCode;
      }

      // Wajib Terdaftar di Master COA: Secara otomatis mendaftarkan COA baru jika belum ada
      // (tidak berlaku untuk baris GL yang sudah ditolak karena di luar scope MIS/IT,
      // supaya akun departemen lain tidak ikut mencemari Master COA sebagai "MIS Department")
      const skipAutoRegister = currentUploadType === 'Monthly GL' && isOutOfMisScopeBySection;
      if (!matchedCoa && cleanCode && !cleanCode.startsWith('UNMAPPED-BUDGET-') && !skipAutoRegister) {
        const newCoaItem: CoaItem = {
          code: cleanCode,
          accountPattern: accountNumberPattern || `${cleanCode}-A7744-*`,
          accountName: rawAccountName || 'Account Baru Terdeteksi',
          category: inferCategory('', rawAccountName),
          department: 'MIS Department',
          registerSystem: 'Auto-Detected',
          status: 'Active',
          description: `Terdeteksi otomatis saat upload: ${rawAccountName || 'Akun Baru'}`,
          inScope: true,
          scopeStatus: 'Active (In-Scope)'
        };
        localNewCoasMap.set(cleanCode.toUpperCase(), newCoaItem);
        matchedCoa = newCoaItem;
      }

      rows.push({
        rowNum,
        coaCode: matchedCoa?.code || cleanCode,
        accountPattern: accountNumberPattern || matchedCoa?.accountPattern,
        accountName: matchedCoa?.accountName || rawAccountName || 'Account Tidak Terdaftar',
        category: matchedCoa?.category || inferCategory(rowCategory, rawAccountName),
        department: matchedCoa?.department || rowDepartment || 'MIS Department',
        sectionCode: sectionCode || matchedCoa?.sectionCode,
        currency,
        amount,
        priorActual,
        forecast,
        isConsolidated: isConsolidatedRow,
        vendor: vendor || undefined,
        postingDate,
        reference: reference || undefined,
        description: rawAccountName || `GL Posting ${cleanCode}`,
        docNo: docNo || `GL-${rowNum}`,
        monthly: monthlyRecord,
        // Budget rows are valid when their COA is valid. Auxiliary fields such as
        // an unrecognized period must not reject an otherwise usable allocation.
        isValid: isBudgetUpload ? true : errors.length === 0,
        isAutoDetected: false,
        errors
      });
    });

    // Safety fallback: If file has no COA column and rows ended up empty, convert all non-empty raw rows into rejected format issues
    if (!hasCoaColumn && rows.length === 0 && effectiveRawJson.length > 0) {
      effectiveRawJson.forEach((row, idx) => {
        const rowVals = Object.values(row).filter(v => v !== '' && v !== null && v !== undefined && !String(v).startsWith('__EXCEL_ROW__'));
        if (rowVals.length > 0) {
          const rowNum = Number(row.__EXCEL_ROW__) || (idx + 2);
          const label = String(rowVals[0] || `Baris Data ${rowNum}`);
          rows.push({
            rowNum,
            coaCode: '(tidak ada COA)',
            accountName: label,
            category: 'Operational',
            department: 'MIS Department',
            currency: 'IDR',
            amount: 0,
            isValid: false,
            isAutoDetected: false,
            errors: ['Rejected Format Issue: Kolom Kode COA (Account Number) tidak ditemukan pada file Excel']
          });
        }
      });
    }

    return {
      rows,
      newCoas: Array.from(localNewCoasMap.values()),
      filteredRows: detectedFilteredRows,
      hasCoaColumn
    };
  };

  // Open inline edit modal for a specific row
  const handleStartEditRow = (row: ParsedRow) => {
    setEditingRowIndex(row.rowNum);
    setEditFormData({
      coaCode: row.coaCode,
      amount: row.amount,
      description: row.description || '',
      docNo: row.docNo || ''
    });
  };

  // Save inline row edit and re-validate
  const handleSaveEditedRow = () => {
    if (!editingRowIndex) return;

    const updatedRaw = parsedRows.map((r) => {
      if (r.rowNum === editingRowIndex) {
        return {
          'Account Number': editFormData.coaCode.trim(),
          'Nominal (Actual Amount)': editFormData.amount,
          'Doc. Number': editFormData.docNo,
          'Account Description': editFormData.description,
          ...(r.monthly || {})
        };
      }
      return {
        'Account Number': r.accountPattern || r.coaCode,
        'Account Description': r.accountName,
        'Nominal (Actual Amount)': r.amount,
        'Doc. Number': r.docNo,
        'Vendor': r.vendor,
        'Posting Date': r.postingDate,
        'Reference': r.reference,
        'Section Code': r.sectionCode,
        ...(r.monthly || {})
      };
    });

    const validated = validateUploadedData(updatedRaw);
    setParsedRows(validated.rows);
    setDetectedNewCoas(validated.newCoas);
    setFileMissingCoaColumn(!validated.hasCoaColumn);
    setEditingRowIndex(null);
  };

  // Delete a faulty row
  const handleDeleteRow = (rowNum: number) => {
    const filtered = parsedRows.filter((r) => r.rowNum !== rowNum);
    const updatedRaw = filtered.map((r) => ({
      'Account Number': r.accountPattern || r.coaCode,
      'Account Description': r.accountName,
      'Nominal (Actual Amount)': r.amount,
      'Doc. Number': r.docNo,
      'Vendor': r.vendor,
      'Posting Date': r.postingDate,
      'Reference': r.reference,
      'Section Code': r.sectionCode,
      ...(r.monthly || {})
    }));
    const validated = validateUploadedData(updatedRaw);
    setParsedRows(validated.rows);
    setDetectedNewCoas(validated.newCoas);
    setFilteredOutRows(validated.filteredRows);
    setFileMissingCoaColumn(!validated.hasCoaColumn);
  };

  // Switch sheet from available sheets in the uploaded workbook
  const handleSwitchSheet = (newSheetName: string) => {
    if (!rawFileBuffer) return;
    try {
      setIsProcessing(true);
      setSelectedSheet(newSheetName);
      const workbook = XLSX.read(rawFileBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[newSheetName];
      if (!worksheet) {
        alert(`Sheet "${newSheetName}" tidak ditemukan.`);
        setIsProcessing(false);
        return;
      }
      parseWorksheetData(worksheet, newSheetName);
    } catch (err: any) {
      alert(`Gagal membaca sheet: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Parses worksheet with multi-row scoring and header detection
  const parseWorksheetData = (worksheet: XLSX.WorkSheet, sheetName: string) => {
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (rawMatrix.length === 0) {
      alert('Worksheet tampak kosong atau tidak memiliki baris data.');
      return;
    }

    // Intelligent Header Detection: scan rows 0 to 35 and score candidate rows
    let bestHeaderRowIndex = -1;
    let highestScore = -1;
    let detectedHeaders: string[] = [];

    const coaHeaderTokens = [
      'account number', 'account no', 'account code', 'coa', 'kode coa', 'no coa', 
      'kode akun', 'no akun', 'gl account', 'gl acct', 'kode rekening', 'rekening',
      'kode perkiraan', 'acc no', 'account', 'coa no', 'coa no.', 'coano'
    ];
    const descHeaderTokens = ['account description', 'nama akun', 'deskripsi', 'description', 'uraian', 'keterangan'];
    const amountHeaderTokens = [
      'nominal', 'actual amount', 'budget amount', 'anggaran', 'nilai anggaran', 
      'total', 'amount', 'budget', 'actual', 'forecast', 'fix cost', 'fixcost', 'cost',
      'apr', 'may', 'mei', 'jun', 'jul', 'aug', 'agu', 'sep', 'oct', 'okt', 'nov', 'dec', 'des'
    ];

    for (let r = 0; r < Math.min(rawMatrix.length, 35); r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;
      
      const nonBlankCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonBlankCells.length < 2) continue; // Skip title banner lines

      let score = 0;
      const rowStrings = row.map(c => String(c || '').toLowerCase().trim());
      const rowJoined = rowStrings.join(' ');

      // Score for COA keywords (+20)
      if (coaHeaderTokens.some(tok => rowStrings.some(s => s === tok || s.includes(tok)))) {
        score += 20;
      }

      // Score for Description keywords (+10)
      if (descHeaderTokens.some(tok => rowStrings.some(s => s === tok || s.includes(tok)))) {
        score += 10;
      }

      // Score for Amount / Month keywords (+15)
      const monthMatches = amountHeaderTokens.filter(tok => rowStrings.some(s => s === tok || s.includes(tok))).length;
      score += Math.min(monthMatches * 3, 25);

      // Penalize metadata / header info rows with colons (e.g. "Departemen: MIS", "Status: Approved")
      if (rowJoined.includes(':')) {
        score -= 10;
      }

      // Penalize rows where almost all cells are numeric
      const numericCount = nonBlankCells.filter(c => typeof c === 'number' || (!isNaN(Number(c)) && Number(c) > 1000)).length;
      if (numericCount > nonBlankCells.length * 0.6) {
        score -= 25; // Likely an actual data row, not a header!
      }

      if (score > highestScore && score >= 15) {
        highestScore = score;
        bestHeaderRowIndex = r;
        detectedHeaders = row.map(cell => String(cell || '').trim());
      }
    }

    // Fallback: If no financial header reached score >= 15 (e.g. arbitrary Excel format without standard COA),
    // find the first candidate table header row with at least 2 non-blank text cells
    if (bestHeaderRowIndex === -1) {
      for (let r = 0; r < Math.min(rawMatrix.length, 15); r++) {
        const row = rawMatrix[r];
        if (!Array.isArray(row)) continue;
        const nonBlank = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        const textCells = nonBlank.filter(c => typeof c === 'string' && isNaN(Number(c)));
        if (textCells.length >= 2 && textCells.length >= nonBlank.length * 0.4) {
          bestHeaderRowIndex = r;
          detectedHeaders = row.map(cell => String(cell || '').trim());
          break;
        }
      }
    }

    if (bestHeaderRowIndex === -1 && rawMatrix.length > 1) {
      bestHeaderRowIndex = 0;
      detectedHeaders = (rawMatrix[0] || []).map(cell => String(cell || '').trim());
    }

    // Check if the row directly below has sub-headers (e.g. wide months under "Period" / "Alokasi")
    if (bestHeaderRowIndex !== -1 && bestHeaderRowIndex + 1 < rawMatrix.length) {
      const nextRow = rawMatrix[bestHeaderRowIndex + 1];
      if (Array.isArray(nextRow)) {
        const nextMonthMatches = nextRow.filter(c => {
          const s = String(c || '').toLowerCase().trim();
          return MONTH_ALIASES[s] !== undefined;
        }).length;

        if (nextMonthMatches >= 3) {
          // Merge sub-headers with primary headers
          detectedHeaders = detectedHeaders.map((h, colIdx) => {
            const sub = String(nextRow[colIdx] || '').trim();
            if (sub && MONTH_ALIASES[sub.toLowerCase()]) {
              return sub;
            }
            return h || sub;
          });
          bestHeaderRowIndex = bestHeaderRowIndex + 1; // Move past sub-header row
        }
      }
    }

    let jsonRows: any[] = [];
    if (bestHeaderRowIndex !== -1 && detectedHeaders.length > 0) {
      for (let r = bestHeaderRowIndex + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!Array.isArray(row) || row.every(c => c === '' || c === null || c === undefined)) continue;
        const obj: Record<string, any> = {};
        detectedHeaders.forEach((h, colIdx) => {
          if (h) {
            const key = obj[h] !== undefined ? `${h}_${colIdx}` : h;
            obj[key] = row[colIdx];
          } else {
            obj[`COL_${colIdx}`] = row[colIdx];
          }
        });
        obj['__EXCEL_ROW__'] = r + 1; // Real 1-based row index in Microsoft Excel
        jsonRows.push(obj);
      }
    } else {
      // Fallback to standard sheet_to_json
      const rawFallback = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
      jsonRows = rawFallback.map((row, idx) => ({ ...row, __EXCEL_ROW__: idx + 2 }));
    }

    if (jsonRows.length === 0) {
      alert('File spreadsheet tampak kosong atau tidak memiliki baris data yang dapat dibaca.');
      return;
    }

    // Inspect headers and early row contents for classification
    const firstRowKeys = Object.keys(jsonRows[0] || {}).map(k => k.toLowerCase().trim());
    
    // Check for explicit Budget indicators (e.g. "FY'26 Budget", "Fix Cost", "Budget", "Pagu", "Anggaran", wide month columns)
    const hasExplicitBudgetCol = firstRowKeys.some(k => 
      k.includes('budget') || k.includes('anggaran') || k.includes('pagu') || k.includes('fix cost') || k.includes('fixcost') ||
      k.includes('fy26') || k.includes("fy'26") || k.includes('fy 26') || k.includes('fy2026') ||
      k.includes('plan') || k.includes('target')
    );
    const hasMonthCols = firstRowKeys.some(k => matchFiscalMonthColumn(k) !== null);

    // Check for explicit Actuals GL indicators (e.g. "Doc. Number", "Posting Date", "Vendor", "Debits", "Credits")
    const hasActualGlCols = firstRowKeys.some(k => 
      k.includes('doc') || k.includes('posting') || k.includes('vendor') || k.includes('debit') || k.includes('dr/cr')
    );

    let activeType = uploadType;
    if (uploadType === 'Budget') {
      // User explicitly selected Budget. Keep as Budget unless it is strictly an SAP transaction journal with Doc No & Posting Date and NO budget columns
      if (hasActualGlCols && !hasExplicitBudgetCol && !hasMonthCols) {
        activeType = 'Monthly GL';
        setUploadType('Monthly GL');
        setAutoDetectionNotice('Format transaksi jurnal SAP GL terdeteksi — tipe upload disesuaikan ke "Monthly GL (Actuals)".');
      } else {
        setAutoDetectionNotice(null);
      }
    } else {
      // User currently has Monthly GL selected. If the file has budget columns or month allocations, switch to Budget!
      if (hasExplicitBudgetCol || hasMonthCols) {
        activeType = 'Budget';
        setUploadType('Budget');
        setAutoDetectionNotice('Format file Fix Cost / Anggaran terdeteksi — tipe upload otomatis disesuaikan ke "Budget".');
      } else {
        setAutoDetectionNotice(null);
      }
    }

    const validated = validateUploadedData(jsonRows, activeType);
    setParsedRows(validated.rows);
    setDetectedNewCoas(validated.newCoas);
    setFilteredOutRows(validated.filteredRows);
    setFileMissingCoaColumn(!validated.hasCoaColumn);
    setCurrentStep(2);
  };

  // Process File ingestion with auto-detection of sheets and headers
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setRawFileBuffer(arrayBuffer);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      setAvailableSheets(workbook.SheetNames);

      // Intelligent sheet selection: prioritize budget/fix cost/gl/actual/data sheets
      let targetSheetName = workbook.SheetNames[0];
      const preferredSheet = workbook.SheetNames.find(s => {
        const lower = s.toLowerCase().trim();
        return lower.includes('budget') || lower.includes('anggaran') || lower.includes('fix cost') || 
               lower.includes('fixcost') || lower.includes('gl') || lower.includes('actual') || 
               lower.includes('core') || lower.includes('data') || lower.includes('sap') || 
               lower.includes('mis') || lower.includes('cost');
      });

      if (preferredSheet) {
        targetSheetName = preferredSheet;
      } else if (workbook.SheetNames.length > 1) {
        // Pick sheet with largest row count
        let maxRows = 0;
        workbook.SheetNames.forEach(sName => {
          const ws = workbook.Sheets[sName];
          if (ws && ws['!ref']) {
            const r = XLSX.utils.decode_range(ws['!ref']);
            const count = r.e.r - r.s.r;
            if (count > maxRows) {
              maxRows = count;
              targetSheetName = sName;
            }
          }
        });
      }

      setSelectedSheet(targetSheetName);
      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        alert('Worksheet tidak dapat dibaca dari file Excel.');
        setIsProcessing(false);
        return;
      }

      parseWorksheetData(worksheet, targetSheetName);
    } catch (err: any) {
      alert(`Gagal memproses file: ${err.message || 'Format tidak dikenali'}`);
    } finally {
      setIsProcessing(false);
    }
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
  const handleLoadSample = (withErrors: boolean = false) => {
    let sampleData: any[] = [];
    if (uploadType === 'Monthly GL') {
      sampleData = coaList.map((c, idx) => ({
        'Account Number': withErrors && idx === 3 ? 'INVALID-999' : (c.accountPattern || `${c.code}-A7744-COMM00`),
        'Account Description': c.accountName,
        'Nominal (Actual Amount)': withErrors && idx === 5 ? 'NOT_A_NUMBER' : Math.round(180_000_000 + idx * 15_000_000),
        'Doc. Number': `DOC-020292-${String(idx + 101).padStart(5, '0')}`,
        'Posting Date': '2026-08-28',
        'Vendor': idx % 3 === 0 ? 'PT. INDOSAT TBK' : idx % 2 === 0 ? 'PT. TELKOM INDONESIA' : 'Direct Core Vendor',
        'Reference': `SAP-640260${idx + 100}`,
        'Section Code': c.sectionCode || 'COMM00',
        'Category': c.category
      }));
    } else {
      sampleData = coaList.map((c, idx) => {
        const row: any = {
          'Account Number': withErrors && idx === 2 ? 'IT-UNKNOWN' : c.code,
          'Account Description': c.accountName,
          'Category': c.category
        };
        FISCAL_MONTHS.forEach((m) => {
          row[m] = Math.round(150_000_000 + idx * 10_000_000);
        });
        return row;
      });
    }

    setUploadedFileName(`SAP_${uploadType.replace(' ', '_')}_${fiscalYear.slice(0, 6)}_${withErrors ? 'WithErrors' : 'Valid'}.xlsx`);
    setUploadedFileSize('380 KB');
    setAutoDetectionNotice(null);
    const validated = validateUploadedData(sampleData);
    setParsedRows(validated.rows);
    setDetectedNewCoas(validated.newCoas);
    setFilteredOutRows(validated.filteredRows);
    setFileMissingCoaColumn(!validated.hasCoaColumn);
    setCurrentStep(2);
  };

  // Accepted & rejected computations
  const acceptedRows = parsedRows.filter((r) => r.isValid);
  const rejectedRows = parsedRows.filter((r) => !r.isValid);
  const totalAmount = acceptedRows.reduce((sum, r) => sum + r.amount, 0);

  // 100% Accuracy checks
  const is100PercentAccurate = parsedRows.length > 0 && rejectedRows.length === 0;
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
    const collision = checkPeriodCollision(uploadType, fiscalYear, uploadType === 'Monthly GL' ? targetMonth : undefined);
    setExistingBatch(collision);
    setGantiDataConfirmed(!collision);
    setCurrentStep(3);
  };

  // Final Commit action
  const handleCommit = async () => {
    if (isSubmitting) return;

    if (existingBatch && !gantiDataConfirmed) {
      alert(language === 'ID' ? 'Anda harus mengonfirmasi penggantian GANTI DATA untuk melanjutkan.' : 'You must confirm the data replacement to proceed.');
      return;
    }

    if (existingBatch && !replaceReason.trim()) {
      alert(language === 'ID' ? 'Alasan penggantian data wajib diisi untuk catatan kepatuhan audit trail.' : 'Replacement reason justification is mandatory for compliance audit trail.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (rawFileBuffer && uploadedFileName) {
        const file = new File([rawFileBuffer], uploadedFileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = uploadType === 'Budget' ? '/api/upload/budget' : '/api/upload/gl';
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Upload failed.');
        }

        void refreshDashboard();
      }
    } catch (error: any) {
      alert(error?.message || 'Upload to API gagal. Silakan periksa file Excel dan koneksi server.');
      setIsSubmitting(false);
      return;
    }

    const result = commitUpload({
      uploadType,
      fiscalYear,
      targetMonth: uploadType === 'Monthly GL' ? targetMonth : undefined,
      fileName: uploadedFileName,
      fileSize: uploadedFileSize,
      rowCount: parsedRows.length,
      acceptedRows: acceptedRows.length,
      rejectedRows: rejectedRows.length,
      totalAmount,
      replaceReason: existingBatch ? replaceReason : undefined,
      newCoas: detectedNewCoas.length > 0 ? detectedNewCoas : undefined,
      parsedGlRecords: uploadType === 'Monthly GL' ? acceptedRows.map((r) => ({
        coaCode: r.coaCode,
        amount: r.amount,
        description: r.description,
        docNo: r.docNo,
        vendor: r.vendor,
        postingDate: r.postingDate,
        periodMonth: targetMonth,
        category: r.category,
        department: r.department,
        sectionCode: r.sectionCode,
        currency: r.currency,
        accountNumberPattern: r.accountPattern
      })) : undefined,
      parsedBudgetRecords: uploadType === 'Budget' ? (() => {
        const budgetByCoa = new Map<string, { coaCode: string; monthly: Record<FiscalMonth, number>; annual: number }>();
        acceptedRows.forEach(r => {
          const code = r.coaCode;
          if (!budgetByCoa.has(code)) {
            budgetByCoa.set(code, {
              coaCode: code,
              monthly: { ...(r.monthly || {} as any) },
              annual: r.amount
            });
          } else {
            const existing = budgetByCoa.get(code)!;
            existing.annual += r.amount;
            if (r.monthly) {
              FISCAL_MONTHS.forEach(m => {
                existing.monthly[m] = (existing.monthly[m] || 0) + (r.monthly![m] || 0);
              });
            }
          }
        });
        return Array.from(budgetByCoa.values());
      })() : undefined
    });

    setCommitResult(result);
    setIsSubmitting(false);

    // Fire celebration confetti!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleResetUpload = () => {
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
                onClick={() => setUploadType('Monthly GL')}
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
                onClick={() => setUploadType('Budget')}
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
                      ? 'Tetapkan atau revisi alokasi pagu anggaran tahunan 12 bulan (Apr - Mar) untuk seluruh akun pos TI.'
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
                  <option value="FY2026/2027">
                    {language === 'ID' ? 'FY 2026/2027 (Tahun Fiskal Aktif)' : 'FY 2026/2027 (Active Year)'}
                  </option>
                  <option value="FY2025/2026">
                    {language === 'ID' ? 'FY 2025/2026 (Tahun Lalu Diaudit)' : 'FY 2025/2026 (Audited Prior Year)'}
                  </option>
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
              accept=".xlsx, .xls, .csv"
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
              {t.orBrowse} ({language === 'ID' ? 'Excel 2007+ .xlsx atau CSV' : 'Excel 2007+ .xlsx or CSV'})
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
                onClick={() => setCurrentStep(1)}
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
                            {fr.snippet || (language === 'ID' ? '(baris kosong)' : '(empty row)')}
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
                  ? (language === 'ID' ? '100% Valid Sesuai COA' : '100% Valid Matching COA') 
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
                    {uploadType === 'Budget'
                      ? (language === 'ID'
                          ? `Pratinjau Alokasi Anggaran (${filteredPreviewRows.length} dari ${acceptedRows.length} Baris Valid)`
                          : `Budget Allocation Preview (${filteredPreviewRows.length} of ${acceptedRows.length} Valid Rows)`)
                      : (language === 'ID'
                          ? `Pratinjau Data Aktual (${filteredPreviewRows.length} dari ${acceptedRows.length} Baris Valid)`
                          : `Actual Data Preview (${filteredPreviewRows.length} of ${acceptedRows.length} Valid Rows)`)}
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
                    <th className="py-2.5 px-3 text-right">
                      {uploadType === 'Budget'
                        ? (language === 'ID' ? 'Nominal (Budget)' : 'Amount (Budget)')
                        : (language === 'ID' ? 'Nominal (Aktual)' : 'Amount (Actual)')}
                    </th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'Vendor / Rekanan' : 'Vendor / Partner'}</th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'No. Dokumen / Ref' : 'Doc No. / Ref'}</th>
                    <th className="py-2.5 px-3">{language === 'ID' ? 'Status' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(uploadType === 'Budget' ? filteredPreviewRows : filteredPreviewRows.slice(0, 100)).map((r) => (
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
                        {r.amount < 0 && uploadType === 'Monthly GL' && (
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
            {uploadType !== 'Budget' && filteredPreviewRows.length > 100 && (
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
              type="button"
              onClick={handleCommit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{language === 'ID' ? 'Menyimpan...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t.commitData}</span>
                </>
              )}
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
                  {language === 'ID' ? 'Status Kondisi Anggaran:' : 'Budget Variance Status:'}
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                  commitResult.isOverBudget 
                    ? 'bg-rose-100 text-rose-700 border-rose-300' 
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                }`}>
                  {commitResult.isOverBudget 
                    ? (language === 'ID' ? '🔴 MELEBIHI PAGU (OVER BUDGET)' : '🔴 OVER BUDGET') 
                    : (language === 'ID' ? '🟢 SESUAI / HEMAT PAGU' : '🟢 ON / UNDER BUDGET')}
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
                    {language === 'ID' ? 'Pagu Pembanding' : 'Benchmark Budget'}
                  </span>
                  <span className="font-bold text-slate-700 text-sm">{formatCurrencyUSD(commitResult.targetBudgetAmount || 0)}</span>
                </div>
              </div>

              {commitResult.isOverBudget ? (
                <div className="p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>{language === 'ID' ? 'Besaran Over Budget:' : 'Over Budget Amount:'}</span>
                    <span className="font-mono font-extrabold text-sm text-rose-700">
                      +{formatCurrencyUSD(commitResult.overBudgetAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{language === 'ID' ? 'Persentase Kelebihan:' : 'Excess Percentage:'}</span>
                    <span className="font-mono font-bold text-rose-800">
                      +{commitResult.overBudgetPercentage}% {language === 'ID' ? 'di atas alokasi' : 'above allocation'}
                    </span>
                  </div>
                  {commitResult.overBudgetAccountsCount ? (
                    <div className="text-[10px] text-rose-700 pt-0.5">
                      ⚠️ {commitResult.overBudgetAccountsCount} {language === 'ID' ? 'pos akun COA melampaui pagu yang disetujui.' : 'COA accounts exceeded approved budget.'}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>{language === 'ID' ? 'Efisiensi Anggaran:' : 'Budget Efficiency:'}</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-700">
                      -{formatCurrencyUSD(Math.abs(commitResult.varianceAmount || 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{language === 'ID' ? 'Persentase Varians:' : 'Variance Percentage:'}</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {commitResult.overBudgetPercentage}% {language === 'ID' ? '(Dalam batas aman)' : '(Within safe margin)'}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-600 leading-snug">
                {commitResult.detailsSummary}
              </p>
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
