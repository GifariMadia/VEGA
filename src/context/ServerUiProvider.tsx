import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type UserProfile as ServerUser, type CoaRecord, type UploadBatch as ServerBatch } from '../lib/api';
import { AuthContext, type AuthContextType } from './AuthContext';
import { DataContext, type DataContextType } from './DataContext';
import { translations } from '../lib/translations';
import { FISCAL_MONTHS, type Language, type UserProfile, type CoaItem, type BudgetStatus, type AccountVarianceSummary, type BudgetHealthBreakdown, type UploadBatch } from '../types';

type Line = { budget: string; actual: string; variance: string; variance_pct: string | null; status: string };
type Account = Line & { coa_code: string; name: string; category: string; has_data: boolean; projected_year_end: string | null; projected_gap: string | null; monthly: (Line & { period: number; loaded: boolean })[] };
interface Summary {
  summary: Line & { utilization_pct: string | null };
  accounts: Account[];
  categories: (Line & { category: string })[];
  available_categories: string[];
  budget_available: boolean;
  projection: { annual_budget: string; year_end_gap: string | null; year_end_actual: string | null; actual_to_date: string; loaded_periods: number[]; missing_periods: number[] };
}
const fyLabel = (year: number) => `FY${year}/${year + 1}`;
const status = (value: string): BudgetStatus => value === 'OVER_BUDGET' ? 'Over Budget' : value === 'UNDER_BUDGET' ? 'Under Budget' : value === 'ALOKASI' ? 'Allocation' : value === 'PENDING_BUDGET' ? 'Pending Budget' : value === 'PENDING_GL' ? 'Pending GL' : 'On Budget';
export const uiUser = (user: ServerUser): UserProfile => ({ id: String(user.id), username: user.username, fullName: user.full_name, email: user.email || '', role: user.role === 'ADMIN' ? 'Administrator' : 'Viewer', status: user.is_active ? 'Active' : 'Suspended', department: 'MIS Department', lastLogin: '-' });
export const uiBatch = (batch: ServerBatch): UploadBatch => ({ id: String(batch.id), uploadType: batch.kind === 'BUDGET' ? 'Budget' : 'Monthly GL', fiscalYear: fyLabel(batch.fiscal_year), targetMonth: batch.period ? FISCAL_MONTHS[batch.period - 1] : undefined, fileName: batch.filename, fileSize: '-', uploadedAt: batch.uploaded_at, uploadedBy: batch.uploaded_by, status: batch.status === 'ACTIVE' ? 'Active' : batch.status === 'CANCELLED' ? 'Cancelled' : 'Replaced', rowCount: batch.rows_read, acceptedRows: batch.rows_imported, rejectedRows: batch.rows_rejected, totalAmount: Number(batch.total_amount), detailsSummary: batch.status === 'CANCELLED' ? 'Unggahan dibatalkan; tidak dihitung dalam dashboard.' : batch.comparison ? `Realisasi dan Budget pembanding untuk bulan ${batch.period ? FISCAL_MONTHS[batch.period - 1] : ''}; dihitung dari data aktif yang sama dengan dashboard.` : 'Tidak ada evaluasi realisasi untuk batch ini. Angka ini adalah nominal file tersimpan.', targetBudgetAmount: batch.comparison ? Number(batch.comparison.budget) : undefined, varianceAmount: batch.comparison ? -Number(batch.comparison.variance) : undefined, overBudgetPercentage: batch.comparison?.variance_pct != null ? -Number(batch.comparison.variance_pct) : undefined, budgetStatus: batch.comparison ? status(batch.comparison.status) : undefined, isOverBudget: batch.comparison?.status === 'OVER_BUDGET', overBudgetAmount: batch.comparison?.status === 'OVER_BUDGET' ? Math.max(0, -Number(batch.comparison.variance)) : undefined, overBudgetAccountsCount: batch.comparison?.over_budget_accounts_count });
const uiCoa = (coa: CoaRecord): CoaItem => ({ code: coa.code, accountName: coa.name, category: coa.category || 'Uncategorized', department: 'MIS Department', registerSystem: (coa.register_system || (coa.is_gl_derived ? 'Auto-Detected' : 'SAP ERP')) as CoaItem['registerSystem'], status: coa.is_active ? 'Active' : 'Inactive', description: coa.description || coa.name, inScope: coa.in_scope ?? true, fiscalYear: coa.manual_budget_fy || undefined, sectionCode: 'MIS000' });

async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await api.request<{ items: T[] }>(`${path}?page=${page}&page_size=100`);
    items.push(...result.data.items);
    if (result.data.items.length < 100) return items;
  }
}

export function ServerUiProvider({ user, language, setLanguage, onLogout, children }: { user: ServerUser; language: Language; setLanguage: (language: Language) => void; onLogout: () => void; children: ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [manualYears, setManualYears] = useState<number[]>([]);
  const [coas, setCoas] = useState<CoaItem[]>([]);
  const [batches, setBatches] = useState<ServerBatch[]>([]);
  const [year, setYear] = useState('');
  const [quarter, setQuarter] = useState('All');
  const [category, setCategory] = useState('All');
  const [department, setDepartment] = useState('All');
  const [data, setData] = useState<Summary | null>(null);
  const [annualData, setAnnualData] = useState<Summary | null>(null);
  const [priorData, setPriorData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refreshUsers = useCallback(async () => {
    if (user.role !== 'ADMIN') return;
    const response = await api.request<{ items: ServerUser[] }>('/users');
    setUsers(response.data.items.map(uiUser));
  }, [user.role]);
  const refreshDashboard = useCallback(async () => {
    const [nextCoas, nextBatches] = await Promise.all([allPages<CoaRecord>('/coa'), allPages<ServerBatch>('/uploads/batches')]);
    setCoas(nextCoas.map(uiCoa)); setBatches(nextBatches); setManualYears([...new Set(nextCoas.filter(coa => coa.is_active && coa.in_scope !== false && coa.manual_budget_amount !== null && coa.manual_budget_fy).map(coa => coa.manual_budget_fy!))]);
    setRevision(value => value + 1);
  }, []);
  useEffect(() => {
    setLoading(true);
    Promise.all([refreshDashboard(), refreshUsers()]).catch(reason => setError(reason.message)).finally(() => setLoading(false));
  }, [refreshDashboard, refreshUsers]);
  const years = useMemo(() => [...new Set([...batches.filter(batch => batch.status === 'ACTIVE').map(batch => batch.fiscal_year), ...manualYears])].sort((a, b) => b - a).map(fyLabel), [batches, manualYears]);
  useEffect(() => { if (!years.includes(year)) setYear(years[0] || ''); }, [years, year]);
  useEffect(() => {
    if (!year) { setData(null); setAnnualData(null); return; }
    let live = true;
    const params = new URLSearchParams({ fiscal_year: year.slice(2, 6) });
    if (category !== 'All') params.set('category', category);
    const annualParams = params.toString();
    if (quarter !== 'All') params.set('quarter', quarter);
    else {
      const periods = batches.filter(batch => batch.status === 'ACTIVE' && batch.kind === 'GL' && fyLabel(batch.fiscal_year) === year).map(batch => batch.period || 0);
      if (periods.length) params.set('period_to', String(Math.max(...periods)));
    }
    setLoading(true); setError(''); setData(null); setAnnualData(null); setPriorData(null);
    const priorYear = Number(year.slice(2, 6)) - 1;
    const priorParams = new URLSearchParams(params); priorParams.set('fiscal_year', String(priorYear));
    const priorRequest = years.includes(fyLabel(priorYear)) ? api.request<Summary>(`/dashboard?${priorParams}`) : Promise.resolve(null);
    Promise.all([api.request<Summary>(`/dashboard?${params}`), api.request<Summary>(`/dashboard?${annualParams}`), priorRequest])
      .then(([selected, annual, prior]) => { if (live) { setData(selected.data); setAnnualData(annual.data); setPriorData(prior?.data || null); } })
      .catch(reason => { if (live) setError(reason.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [year, quarter, category, revision]);

  const auth = useMemo<AuthContextType>(() => ({
    currentUser: uiUser(user), isAuthenticated: true, users, language, setLanguage, t: translations[language], isAdmin: user.role === 'ADMIN',
    login: async () => ({ success: false, error: 'Gunakan halaman login.' }), logout: onLogout,
    switchRole: () => { /* The authenticated server role cannot be switched in the browser. */ },
    updateUser: async value => { await api.request(`/users/${value.id}`, { method: 'PUT', body: JSON.stringify({ full_name: value.fullName, email: value.email || null, role: value.role === 'Administrator' ? 'ADMIN' : 'USER', is_active: value.status === 'Active' }) }); await refreshUsers(); },
    resetUserPassword: async (id, password) => { await api.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ password }) }); return true; },
    addUser: async (value, password) => { await api.request('/users', { method: 'POST', body: JSON.stringify({ username: value.username, full_name: value.fullName, email: value.email || null, role: value.role === 'Administrator' ? 'ADMIN' : 'USER', password }) }); await refreshUsers(); },
  }), [user, users, language, setLanguage, onLogout, refreshUsers]);

  const value = useMemo<DataContextType>(() => {
    const projection = data?.projection;
    const accounts: AccountVarianceSummary[] = (data?.accounts || []).filter(account => account.has_data).map(account => {
      const annual = annualData?.accounts.find(row => row.coa_code === account.coa_code);
      const prior = priorData?.accounts.find(row => row.coa_code === account.coa_code && row.has_data);
      const priorBudget = prior ? Number(prior.budget) : undefined;
      const priorActual = prior ? Number(prior.actual) : undefined;
      const budget = Number(account.budget), actual = Number(account.actual);
      const annualBudget = Number(annual?.budget || 0);
      const projected = projection?.loaded_periods.length ? Number(annual?.projected_year_end || 0) : 0;
      return { coaCode: account.coa_code, accountName: account.name, category: account.category, department: 'MIS Department', budgetYtd: budget, actualYtd: actual, variance: -Number(account.variance), variancePct: account.variance_pct === null ? Number.NaN : -Number(account.variance_pct), absorptionRate: budget > 0 && account.status !== 'PENDING_GL' ? actual / budget * 100 : Number.NaN, annualBudget, projectedYearEnd: projected, projectedGap: Number(annual?.projected_gap || 0), status: status(account.status), priorYearBudgetYtd: priorBudget, priorYearActualYtd: priorActual, priorYearVariance: prior ? -Number(prior.variance) : undefined, priorYearVariancePct: prior?.variance_pct ? -Number(prior.variance_pct) : undefined, priorYearAbsorptionRate: priorBudget !== undefined && priorBudget > 0 ? Number(priorActual) / priorBudget * 100 : undefined, yoyActualGrowthPct: priorActual ? (actual - priorActual) / Math.abs(priorActual) * 100 : undefined };
    });
    const budget = Number(data?.summary.budget || 0), actual = Number(data?.summary.actual || 0);
    const overallStatus = status(data?.summary.status || 'ON_BUDGET');
    const health: BudgetHealthBreakdown = { totalAccounts: accounts.filter(account => account.status !== 'Allocation' && account.status !== 'Pending GL' && account.status !== 'Pending Budget').length, totalBudget: budget, totalActual: actual, overallStatus, overallAbsorption: Number(data?.summary.utilization_pct ?? Number.NaN), overallVariancePct: -Number(data?.summary.variance_pct ?? Number.NaN), overBudgetCount: 0, overBudgetPct: 0, overBudgetBudgetAmount: 0, overBudgetActualAmount: 0, onBudgetCount: 0, onBudgetPct: 0, onBudgetBudgetAmount: 0, onBudgetActualAmount: 0, underBudgetCount: 0, underBudgetPct: 0, underBudgetBudgetAmount: 0, underBudgetActualAmount: 0 };
    for (const [label, prefix] of [['Over Budget', 'overBudget'], ['On Budget', 'onBudget'], ['Under Budget', 'underBudget']] as const) {
      const group = accounts.filter(account => account.status === label);
      health[`${prefix}Count`] = group.length; health[`${prefix}Pct`] = health.totalAccounts ? group.length / health.totalAccounts * 100 : 0;
      health[`${prefix}BudgetAmount`] = group.reduce((sum, account) => sum + account.budgetYtd, 0);
      health[`${prefix}ActualAmount`] = group.reduce((sum, account) => sum + account.actualYtd, 0);
    }
    const loaded = (projection?.loaded_periods || []).map(period => FISCAL_MONTHS[period - 1]);
    const uploads = batches.map(uiBatch);
    return {
      coaList: coas, budgets: [], glTransactions: [], uploads, auditNotes: [], availableFiscalYears: years, availableCategories: data?.available_categories || [...new Set(coas.map(coa => coa.category))], loadedMonths: loaded,
      selectedFiscalYear: year, setSelectedFiscalYear: setYear, selectedQuarter: quarter, setSelectedQuarter: setQuarter, selectedCategory: category, setSelectedCategory: setCategory, selectedDepartment: department, setSelectedDepartment: setDepartment,
      resetFilters: () => { setQuarter('All'); setCategory('All'); setDepartment('All'); }, hasActiveFilters: quarter !== 'All' || category !== 'All' || department !== 'All',
      latestClosedMonth: loaded[loaded.length - 1] || 'Apr',
      kpiSummary: { totalBudget: budget, totalActual: actual, variance: -Number(data?.summary.variance || 0), variancePct: -Number(data?.summary.variance_pct ?? Number.NaN), status: overallStatus, annualBudget: Number(projection?.annual_budget || 0), projectedYearEnd: Number(projection?.year_end_actual || 0), projectedGap: Number(projection?.year_end_gap || 0), absorptionRate: Number(data?.summary.utilization_pct ?? Number.NaN), healthBreakdown: health },
      categorySummaries: (data?.categories || []).map(row => ({ category: row.category, budget: Number(row.budget), actual: Number(row.actual), variance: -Number(row.variance), variancePct: -Number(row.variance_pct ?? Number.NaN), absorptionRate: Number(row.budget) > 0 && row.status !== 'PENDING_GL' ? Number(row.actual) / Number(row.budget) * 100 : Number.NaN, accountCount: accounts.filter(account => account.category === row.category).length, status: status(row.status) })),
      priorFiscalYear: priorData ? fyLabel(Number(year.slice(2, 6)) - 1) : undefined,
      allAccountSummaries: accounts,
      worstCoaList: accounts.filter(account => account.status === 'Over Budget').sort((a, b) => b.variance - a.variance).slice(0, 10),
      highestAbsorptionList: accounts.filter(a => Number.isFinite(a.absorptionRate)).sort((a, b) => b.absorptionRate - a.absorptionRate).slice(0, 10), lowestAbsorptionList: accounts.filter(a => Number.isFinite(a.absorptionRate)).sort((a, b) => a.absorptionRate - b.absorptionRate).slice(0, 10),
      monthlyMatrixRows: (annualData?.accounts || []).filter(account => account.has_data).map(account => ({ coa: coas.find(coa => coa.code === account.coa_code) || { code: account.coa_code, accountName: account.name, category: account.category, department: 'MIS Department', registerSystem: 'SAP ERP', status: 'Active', description: account.name }, monthlyActuals: Object.fromEntries(account.monthly.map(month => [FISCAL_MONTHS[month.period - 1], month.loaded ? Number(month.actual) : null])) as Record<typeof FISCAL_MONTHS[number], number | null>, monthlyBudgets: Object.fromEntries(account.monthly.map(month => [FISCAL_MONTHS[month.period - 1], Number(month.budget)])) as Record<typeof FISCAL_MONTHS[number], number | null>, ytdActual: Number(account.actual), ytdBudget: account.monthly.filter(month => month.period <= Math.max(0, ...(projection?.loaded_periods || []))).reduce((sum, month) => sum + Number(month.budget), 0), ytdVariance: account.monthly.filter(month => month.period <= Math.max(0, ...(projection?.loaded_periods || []))).reduce((sum, month) => sum + Number(month.actual) - Number(month.budget), 0) })),
      refreshDashboard, isApiLoading: loading,
      checkPeriodCollision: (kind, fiscalYear, month) => uploads.find(batch => batch.status === 'Active' && batch.uploadType === kind && batch.fiscalYear === fiscalYear && (kind === 'Budget' || batch.targetMonth === month)) || null,
      addNewCoa: async (coa, initialBudget) => {
        try { await api.request('/coa', { method: 'POST', body: JSON.stringify({ code: coa.code, name: coa.accountName, category: coa.category, is_active: coa.status === 'Active', description: coa.description, register_system: coa.registerSystem, in_scope: coa.inScope ?? true, initial_budget: initialBudget, fiscal_year: coa.fiscalYear }) }); await refreshDashboard(); return { success: true, message: 'COA disimpan.' }; }
        catch (reason) { return { success: false, message: reason instanceof Error ? reason.message : 'Gagal menyimpan COA.' }; }
      },
      addCoas: () => { throw new Error('COA dari GL dibuat saat konfirmasi upload.'); }, commitUpload: () => { throw new Error('Gunakan konfirmasi upload server.'); }, appendAuditNote: () => { throw new Error('Audit dicatat otomatis oleh server.'); },
    };
  }, [data, annualData, priorData, coas, batches, years, year, quarter, category, department, refreshDashboard, loading]);
  return <AuthContext.Provider value={auth}><DataContext.Provider value={value}>{error && <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{data && !data.budget_available && <p role="status" className="mx-4 my-2 text-xs text-slate-500">Budget belum tersedia untuk tahun fiskal ini. Realisasi GL sudah tersimpan; status anggaran belum dapat dievaluasi sampai Budget diunggah.</p>}{data && data.projection.missing_periods.length > 0 && <p role="status" className="mx-4 my-2 text-xs text-slate-500">GL belum tersedia untuk {data.projection.missing_periods.map(period => FISCAL_MONTHS[period - 1]).join(', ')}. Realisasi mencakup file yang sudah diunggah; evaluasi periode ini masih sementara.</p>}{children}</DataContext.Provider></AuthContext.Provider>;
}
