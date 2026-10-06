import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type UploadBatch } from '../../lib/api';
import type { Language } from '../../types';

type Line = { budget: string; actual: string; variance: string; variance_pct: string | null; status: string };
type Month = Line & { period: number; month: string; loaded?: boolean };
interface Account extends Line { coa_code: string; name: string; category: string; has_data: boolean; is_gl_derived: boolean; monthly: Month[] }
interface DashboardData {
  summary: Line & { utilization_pct: string | null; over_budget_count: number; under_budget_count: number; on_budget_count: number; alokasi_count: number };
  available_categories: string[]; accounts: Account[]; monthly: Month[];
  categories: (Line & { category: string })[];
  quarters: (Line & { quarter: string; months: string[]; loaded: boolean })[];
  projection: { months_loaded: number; loaded_periods: number[]; annual_budget: string; actual_to_date: string; remaining_budget: string; months_remaining: number; allowed_monthly_spend: string | null; year_end_actual: string | null };
}
const fmt = (n: string | null) => n == null ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const card = 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm';
const control = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold';
const labels: Record<string, [string, string]> = { OVER_BUDGET: ['Melebihi budget', 'Over budget'], UNDER_BUDGET: ['Di bawah budget', 'Under budget'], ON_BUDGET: ['Sesuai budget', 'On budget'], ALOKASI: ['Alokasi', 'Allocation'] };
function Status({ value, id }: { value: string; id: boolean }) {
  return <span className={`whitespace-nowrap rounded border px-2 py-1 text-[11px] font-bold ${value === 'OVER_BUDGET' ? 'border-red-200 bg-red-50 text-red-700' : value === 'ALOKASI' ? 'border-violet-200 bg-violet-50 text-violet-700' : value === 'UNDER_BUDGET' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{labels[value]?.[id ? 0 : 1] ?? value}</span>;
}
function BarPair({ label, budget, actual, max }: { label: string; budget: string; actual: string; max: number; key?: string | number }) {
  // A central zero baseline preserves the direction of allocation/credit amounts.
  const bar = (value: string, color: string) => <div className="relative h-3 bg-slate-100"><div className="absolute inset-y-0 left-1/2 border-l border-slate-400" /><div className={`absolute inset-y-0 ${color}`} style={{ width: `${Math.abs(Number(value)) / max * 50}%`, left: Number(value) < 0 ? `${50 - Math.abs(Number(value)) / max * 50}%` : '50%' }} /></div>;
  return <div className="space-y-1"><div className="flex justify-between gap-2 text-xs"><span className="font-semibold">{label}</span><span className="text-right tabular-nums text-slate-500">{fmt(actual)} / {fmt(budget)}</span></div>{bar(budget, 'bg-blue-500')}{bar(actual, Number(actual) > Number(budget) ? 'bg-red-500' : 'bg-emerald-500')}</div>;
}
interface Props { batches: UploadBatch[]; language: Language; onNavigate?: (page: 'upload') => void; isAdmin?: boolean; refreshKey?: string; matrix?: boolean }
export function ApiDashboardView({ batches, language, onNavigate, isAdmin, refreshKey, matrix = false }: Props) {
  const id = language === 'ID';
  const years = useMemo(() => [...new Set(batches.filter(b => b.status === 'ACTIVE').map(b => b.fiscal_year))].sort((a,b) => b-a), [batches]);
  const [year, setYear] = useState<number | null>(null);
  const [quarter, setQuarter] = useState('');
  const [category, setCategory] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (year === null || !years.includes(year)) setYear(years[0] ?? null); }, [years, year]);
  useEffect(() => {
    if (year === null) { setData(null); return; }
    let live = true;
    const params = new URLSearchParams({ fiscal_year: String(year) });
    if (quarter) params.set('quarter', quarter);
    if (category) params.set('category', category);
    setData(null); setError(''); setLoading(true);
    api.request<DashboardData>(`/dashboard?${params}`).then(r => { if (live) setData(r.data); }).catch(e => { if (live) setError(e instanceof ApiError ? e.message : 'Dashboard failed to load.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [year, quarter, category, refreshKey]);
  const rows = data?.accounts.filter(a => showEmpty || a.has_data) ?? [];
  const active = batches.filter(b => b.status === 'ACTIVE' && b.fiscal_year === year);
  const csv = () => {
    if (!data) return;
    const output = matrix
      ? [['COA', 'Name', ...data.monthly.flatMap(m => [`${m.month} Budget`, `${m.month} Actual`])], ...rows.map(a => [a.coa_code, a.name, ...a.monthly.flatMap(m => [m.budget, m.loaded ? m.actual : ''])])]
      : [['COA','Name','Category','Budget','Actual','Variance','Variance %','Status'], ...rows.map(a => [a.coa_code,a.name,a.category,a.budget,a.actual,a.variance,a.variance_pct ?? '',a.status])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + output.map(r => r.map((v, i) => { const raw = String(v); const safe = (i === 1 || (!matrix && i === 2)) && /^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw; return `"${safe.replace(/"/g, '""')}"`; }).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `vega-${matrix ? 'matrix' : 'dashboard'}-FY${year}-${quarter || 'all'}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  if (!years.length) return <section className={`${card} text-center`}><h2 className="font-bold">{id ? 'Belum ada data' : 'No data yet'}</h2><p className="my-3 text-sm text-slate-500">{id ? 'Unggah Budget lalu GL bulanan. Semua angka dihitung dari unggahan aktif.' : 'Upload Budget then monthly GL. All figures use active uploads.'}</p>{isAdmin && <button className={control} onClick={() => onNavigate?.('upload')}>{id ? 'Unggah data' : 'Upload data'}</button>}</section>;
  const max = (items: Line[]) => Math.max(1, ...items.flatMap(r => [Math.abs(Number(r.budget)), Math.abs(Number(r.actual))]));
  const p = data?.projection;
  return <section className="min-w-0 space-y-5 pb-12">
    <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
      <div className="text-xs text-slate-500"><p>{id ? 'Budget aktif' : 'Active budget'}: {active.find(b => b.kind === 'BUDGET')?.filename ?? '-'}</p><p className="mt-1">GL: {active.filter(b => b.kind === 'GL').length} / 12 · Variance = Budget − Actual</p></div>
      <div className="flex flex-wrap gap-2"><select aria-label="Fiscal year" className={control} value={year ?? ''} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>FY{String(y).slice(-2)} (Apr {y} – Mar {y+1})</option>)}</select>{!matrix && <select aria-label="Quarter" className={control} value={quarter} onChange={e => setQuarter(e.target.value)}><option value="">{id ? 'Semua kuartal' : 'All quarters'}</option>{['Q1','Q2','Q3','Q4'].map(q => <option key={q}>{q}</option>)}</select>}<select aria-label="Category" className={control} value={category} onChange={e => setCategory(e.target.value)}><option value="">{id ? 'Semua kategori' : 'All categories'}</option>{(data?.available_categories ?? (category ? [category] : [])).map(c => <option key={c}>{c}</option>)}</select></div>
    </div>
    {loading && <p role="status">{id ? 'Memuat data...' : 'Loading...'}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {data && p && <>
      {!matrix && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
          ['Total Budget', data.summary.budget], [id ? 'Total Aktual' : 'Total Actual', data.summary.actual], ['Variance', data.summary.variance], [id ? 'Akun Over Budget' : 'Over-budget accounts', String(data.summary.over_budget_count)], [id ? 'Proyeksi Akhir Tahun' : 'Year-end projection', p.year_end_actual]
        ].map(([title,value]) => <div className={card} key={title}><p className="text-xs font-bold text-slate-500">{title}</p><p className="mt-3 break-words text-xl font-extrabold tabular-nums">{title?.includes('accounts') || title?.includes('Akun') ? value : fmt(value)}</p></div>)}</div>
        <p className="text-xs text-slate-500">{id ? 'Status: tanpa toleransi, setelah pembulatan 2 desimal. Budget negatif = Alokasi.' : 'Status: zero tolerance after rounding to 2 decimals. Negative budget = Allocation.'} · {data.summary.under_budget_count} under · {data.summary.on_budget_count} on · {data.summary.alokasi_count} {id ? 'alokasi' : 'allocation'} · {data.summary.utilization_pct == null ? (id ? 'Persentase pemakaian tidak tersedia untuk budget nol/negatif' : 'Utilization unavailable for zero/negative budget') : `${fmt(data.summary.utilization_pct)}% ${id ? 'terpakai' : 'used'}`}</p>
        <div className="grid gap-4 xl:grid-cols-3"><div className={`${card} xl:col-span-2`}><h2 className="text-sm font-bold">{id ? 'Budget vs Aktual per Kategori' : 'Budget vs Actual by Category'}</h2><p className="my-3 text-[11px] text-slate-500">{id ? 'Biru = budget; hijau/merah = aktual. Nilai negatif di kiri garis nol. Angka: aktual / budget.' : 'Blue = budget; green/red = actual. Negative amounts extend left of zero. Values: actual / budget.'}</p><div className="space-y-4">{data.categories.filter(r => Number(r.budget) || Number(r.actual)).map(r => <BarPair key={r.category} label={r.category} budget={r.budget} actual={r.actual} max={max(data.categories)} />)}</div></div>
        <div className={card}><h2 className="text-sm font-bold">{id ? 'Proyeksi & Sisa Budget' : 'Projection & Remaining'}</h2><p className="my-3 text-xs text-slate-500">{id ? 'Tahunan, mengikuti kategori; tidak dibatasi filter kuartal.' : 'Annual, follows category; independent of quarter filter.'}</p><dl className="space-y-3 text-xs">{[[id ? 'Budget tahunan' : 'Annual budget',p.annual_budget],[id ? 'Aktual saat ini' : 'Actual to date',p.actual_to_date],[id ? 'Sisa budget' : 'Remaining budget',p.remaining_budget],[id ? 'Batas rata-rata/bulan' : 'Allowed monthly average',p.allowed_monthly_spend]].map(([label,value]) => <div className="flex justify-between gap-2" key={label}><dt>{label}</dt><dd className="font-bold tabular-nums">{fmt(value)}</dd></div>)}</dl><p className="mt-4 text-xs">{p.months_loaded} {id ? 'bulan GL dimuat' : 'GL months loaded'} · {p.months_remaining} {id ? 'bulan tersisa' : 'months remaining'}</p></div></div>
        <div className={card}><h2 className="mb-4 text-sm font-bold">{id ? 'Tren Kuartal (Apr–Mar)' : 'Quarterly Trend (Apr–Mar)'}</h2><div className="grid gap-5 sm:grid-cols-2">{data.quarters.map(r => <BarPair key={r.quarter} label={`${r.quarter} · ${r.months.join('–')}${r.loaded ? '' : id ? ' (belum lengkap)' : ' (incomplete)'}`} budget={r.budget} actual={r.actual} max={max(data.quarters)} />)}</div></div>
        <div className={card}><h2 className="mb-4 text-sm font-bold">{id ? 'Tren Bulanan (Apr–Mar)' : 'Monthly Trend (Apr–Mar)'}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.monthly.map(r => <BarPair key={r.period} label={`${r.month}${p.loaded_periods.includes(r.period) ? '' : id ? ' · GL belum dimuat' : ' · GL not loaded'}`} budget={r.budget} actual={r.actual} max={max(data.monthly)} />)}</div></div>
      </>}
      <div className={`${card} !p-0 overflow-hidden`}><div className="flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="text-sm font-bold">{matrix ? id ? 'Matriks Bulanan' : 'Monthly Matrix' : id ? 'Detail per Akun' : 'Per-account detail'} ({rows.length})</h2><div className="flex items-center gap-3 text-xs"><label><input type="checkbox" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} /> {id ? 'Tampilkan akun tanpa data' : 'Show empty accounts'}</label><button className={control} onClick={csv}>CSV</button></div></div>
      {matrix && <p className="px-4 pb-3 text-xs text-slate-500">{id ? 'Setiap sel: Budget / Aktual. Tanda - berarti GL belum diunggah; 0.00 berarti bulan sudah dimuat.' : 'Each cell: Budget / Actual. A dash means GL is not uploaded; 0.00 means the month is loaded.'}</p>}
      <div className="max-h-[520px] overflow-auto"><table className={`w-full text-left text-xs ${matrix ? 'min-w-[1900px]' : 'min-w-[820px]'}`}><thead className="sticky top-0 bg-slate-50 uppercase text-slate-500"><tr>{(matrix ? ['COA',id ? 'Deskripsi' : 'Description',...data.monthly.map(m => m.month)] : ['COA',id ? 'Deskripsi' : 'Description',id ? 'Kategori' : 'Category','Budget','Actual','Variance','%','Status']).map(h => <th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(a => <tr key={a.coa_code}><td className="whitespace-nowrap px-4 py-3 font-mono">{a.coa_code}{a.is_gl_derived && <span className="ml-1 rounded bg-blue-50 p-1 text-blue-700">GL</span>}</td><td className="px-4 py-3">{a.name}</td>{matrix ? a.monthly.map(m => <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums" key={m.period}><div>{fmt(m.budget)}</div><div className="mt-1 text-slate-500">{m.loaded ? fmt(m.actual) : '-'}</div></td>) : <><td className="px-4 py-3">{a.category}</td>{[a.budget,a.actual,a.variance].map((v,i) => <td className="px-4 py-3 text-right tabular-nums" key={i}>{fmt(v)}</td>)}<td className="px-4 py-3 text-right">{a.variance_pct == null ? '-' : `${fmt(a.variance_pct)}%`}</td><td className="px-4 py-3"><Status value={a.status} id={id} /></td></>}</tr>)}{!rows.length && <tr><td colSpan={matrix ? 14 : 8} className="p-8 text-center">{id ? 'Tidak ada data untuk filter ini.' : 'No data for this filter.'}</td></tr>}</tbody></table></div></div>
    </>}
  </section>;
}
