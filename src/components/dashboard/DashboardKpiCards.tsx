import { DollarSign, BarChart3, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyUSD, formatPercentage } from '../../lib/calculations';

export function DashboardKpiCards() {
  const { kpiSummary, loadedMonths = [] } = useData();
  const { t, language } = useAuth();
  const currentStatusBadge = { label: kpiSummary.status === 'Pending Budget' ? (language === 'ID' ? 'Budget belum tersedia' : 'Awaiting Budget') : kpiSummary.status === 'Pending GL' ? (language === 'ID' ? 'Belum ada GL' : 'Awaiting GL') : kpiSummary.status === 'Allocation' ? (language === 'ID' ? 'Alokasi' : 'Allocation') : kpiSummary.status === 'Over Budget' ? t.statusOverBudget : kpiSummary.status === 'Under Budget' ? t.statusUnderBudget : t.statusOnBudget };
  const neutral = kpiSummary.status === 'Allocation' || kpiSummary.status === 'Pending GL' || kpiSummary.status === 'Pending Budget';
  const overBudget = kpiSummary.status === 'Over Budget';
  const varianceColor = neutral ? 'text-slate-600' : overBudget ? 'text-rose-600' : 'text-emerald-600';
  const varianceIconColor = neutral ? 'bg-slate-100 text-slate-600' : overBudget ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600';
  const projectionNeutral = !loadedMonths.length || kpiSummary.annualBudget <= 0;
  return (<div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Budget */}
            <div
              id="kpi-budget-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiTotalBudget}
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatCurrencyUSD(kpiSummary.totalBudget, true)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {formatCurrencyUSD(kpiSummary.totalBudget)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{t.kpiAnnualBudget}</span>
                <span className="font-mono font-bold text-slate-700">
                  {formatCurrencyUSD(kpiSummary.annualBudget, true)}
                </span>
              </div>
            </div>

            {/* Card 2: Total Actual */}
            <div
              id="kpi-actual-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiTotalActual}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatCurrencyUSD(kpiSummary.totalActual, true)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {formatCurrencyUSD(kpiSummary.totalActual)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t.kpiStatus}</span>
                <span className={`font-mono font-bold ${
                  neutral ? 'text-slate-600' : kpiSummary.status === 'Over Budget'
                    ? 'text-rose-600'
                    : kpiSummary.status === 'On Budget' || kpiSummary.status === 'On Track'
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}>
                  {currentStatusBadge.label} ({formatPercentage(kpiSummary.absorptionRate)})
                </span>
              </div>
            </div>

            {/* Card 3: Variance + % */}
            <div
              id="kpi-variance-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiVariance} ({t.metricActual} - {t.metricBudget})
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  varianceIconColor
                }`}>
                  {kpiSummary.variance > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-black font-mono tracking-tight flex items-baseline gap-2 ${
                  varianceColor
                }`}>
                  <span>{formatCurrencyUSD(kpiSummary.variance, true)}</span>
                  <span className="text-sm font-bold">
                    ({formatPercentage(kpiSummary.variancePct, true)})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {formatCurrencyUSD(kpiSummary.variance)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t.varianceType}</span>
                <span className={`font-bold ${
                  varianceColor
                }`}>
                  {neutral ? currentStatusBadge.label : overBudget ? t.overExpenditure : kpiSummary.status === 'Under Budget' ? t.favorableSavings : t.statusOnBudget}
                </span>
              </div>
            </div>

            {/* Card 4: Year-End Projection */}
            <div
              id="kpi-projection-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiYearEndProjection}
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {loadedMonths.length ? formatCurrencyUSD(kpiSummary.projectedYearEnd, true) : '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Gap: {loadedMonths.length && kpiSummary.status !== 'Pending Budget' ? formatCurrencyUSD(kpiSummary.projectedGap, true) : '-'}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t.kpiProjectedGap}</span>
                <span className={`font-mono font-bold ${
                  projectionNeutral ? 'text-slate-600' : kpiSummary.projectedGap > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {loadedMonths.length && kpiSummary.status !== 'Pending Budget' && kpiSummary.projectedGap > 0 ? '+' : ''}{loadedMonths.length && kpiSummary.status !== 'Pending Budget' ? formatCurrencyUSD(kpiSummary.projectedGap, true) : '-'}
                </span>
              </div>
            </div>
          </div>
  );
}
