import React, { useState, useMemo } from 'react';
import { CategorySummary, FiscalMonth } from '../../types';
import { formatCurrencyUSD, formatPercentage } from '../../lib/calculations';
import { 
  Layers, 
  Calendar, 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Info,
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

interface GroupedBarChartProps {
  categorySummaries: CategorySummary[];
  monthlyData?: {
    month: FiscalMonth;
    budget: number;
    actual: number;
    isClosed: boolean;
  }[];
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  categorySummaries,
  monthlyData = []
}) => {
  const { language } = useAuth();
  const { kpiSummary } = useData();
  const [chartMode, setChartMode] = useState<'category' | 'monthly'>('category');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Labels based on language
  const labels = {
    categoryTab: language === 'ID' ? 'Kategori Beban TI' : 'By IT Category',
    monthlyTab: language === 'ID' ? 'Tren Bulanan (Apr–Mar)' : 'By Fiscal Month',
    budgetLegend: language === 'ID' ? 'Anggaran' : 'Budget',
    actualLegend: language === 'ID' ? 'Realisasi' : 'Actual',
    overBudgetLegend: language === 'ID' ? 'Melebihi Anggaran' : 'Over Budget',
    underBudgetLegend: language === 'ID' ? 'Di Bawah Anggaran' : 'Under Budget',
    onBudgetLegend: language === 'ID' ? 'Sesuai Anggaran' : 'On Budget',
    variance: language === 'ID' ? 'Varians' : 'Variance',
    absorption: language === 'ID' ? 'Penyerapan' : 'Absorption',
    status: language === 'ID' ? 'Status' : 'Status',
    monthClosed: language === 'ID' ? 'Tutup Buku' : 'Closed Period',
    monthPlanned: language === 'ID' ? 'Rencana' : 'Projected',
    monthNotUploaded: language === 'ID' ? 'Realisasi belum diunggah' : 'Actuals not yet ingested',
  };

  // Determine maximum value for Y-axis scaling
  const maxCategoryValue = Math.max(
    ...categorySummaries.map((c) => Math.max(Math.abs(c.budget), Math.abs(c.actual))),
    1
  );

  const maxMonthlyValue = Math.max(
    ...monthlyData.map((m) => Math.max(Math.abs(m.budget), Math.abs(m.actual))),
    1
  );

  const currentMax = chartMode === 'category' ? maxCategoryValue : maxMonthlyValue;
  
  // Ceiling with 1.25x headroom
  const rawCeiling = currentMax * 1.25;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawCeiling)));
  const yAxisCeiling = Math.ceil(rawCeiling / magnitude) * magnitude;

  const signed = chartMode === 'category' ? categorySummaries.some(row => row.budget < 0 || row.actual < 0) : monthlyData.some(row => row.budget < 0 || row.actual < 0);
  const axisRange = yAxisCeiling * (signed ? 2 : 1);
  const zeroPct = signed ? 50 : 0;
  const yTicks = signed ? [yAxisCeiling, yAxisCeiling / 2, 0, -yAxisCeiling / 2, -yAxisCeiling] : [yAxisCeiling, yAxisCeiling * 0.75, yAxisCeiling * 0.5, yAxisCeiling * 0.25, 0];
  const barHeight = (value: number) => value === 0 ? 0 : Math.min(100, Math.max(0.2, Math.abs(value) / axisRange * 100));
  const barStyle = (value: number, height: number) => ({ height: `${height}%`, bottom: `${value < 0 ? zeroPct - height : zeroPct}%` });

  // Dynamic insights for footer
  const { highestVarianceCat, bestDisciplinedCat } = useMemo(() => {
    const sortedDesc = categorySummaries.filter(cat => cat.status === 'Over Budget').sort((a, b) => b.variance - a.variance);
    const sortedAsc = categorySummaries.filter(cat => cat.status === 'Under Budget' || cat.status === 'On Budget').sort((a, b) => a.variance - b.variance);
    return {
      highestVarianceCat: sortedDesc[0] || null,
      bestDisciplinedCat: sortedAsc[0] || null
    };
  }, [categorySummaries]);

  return (
    <div 
      id="grouped-bar-chart-container"
      className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5"
    >
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center font-bold shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {language === 'ID' ? 'Diagram Batang Perbandingan Budget vs Actual' : 'Grouped Bar Chart: Budget vs Actual'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ID'
                  ? 'Angka skala sumbu diletakkan di sisi kiri agar tidak tertutupi oleh batang diagram'
                  : 'Y-axis scale numbers are positioned cleanly on the left side'}
              </p>
            </div>
          </div>
        </div>

        {/* Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs font-bold">
            <button
              id="chart-mode-category-btn"
              onClick={() => {
                setChartMode('category');
                setHoveredIndex(null);
                setSelectedIndex(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'category'
                  ? 'bg-white text-[#1E5EFF] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{labels.categoryTab}</span>
            </button>
            <button
              id="chart-mode-monthly-btn"
              onClick={() => {
                setChartMode('monthly');
                setHoveredIndex(null);
                setSelectedIndex(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'monthly'
                  ? 'bg-white text-[#1E5EFF] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{labels.monthlyTab}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {/* Budget Legend */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-slate-300 border border-slate-400/30 inline-block shrink-0" />
            <span className="font-semibold text-slate-700">{labels.budgetLegend}</span>
          </div>

          {/* Actual Legend */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#1E5EFF] inline-block shadow-2xs shrink-0" />
            <span className="font-bold text-slate-900">{labels.actualLegend}</span>
          </div>

          {/* Over Budget Flag Legend */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block shadow-2xs shrink-0" />
            <span className="font-semibold text-rose-700">{labels.overBudgetLegend}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{language === 'ID' ? 'Klik atau arahkan kursor ke batang untuk rincian detail' : 'Click or hover on bars for detail card'}</span>
        </div>
      </div>

      {/* Main Chart Area: Strictly Separated Left Column (Y-Axis) and Right Column (Bars & Grid) */}
      <div className="relative pt-6 pb-2 select-none">
        {/* Category Mode */}
        {chartMode === 'category' && (
          <div className="w-full">
            <div className="flex items-start w-full">
              {/* KOLOM KIRI KHUSUS: Angka Skala Sumbu Y (Berada di luar area batang, 100% tidak tertutupi) */}
              <div className="w-20 sm:w-24 shrink-0 flex flex-col justify-between items-end pr-3 select-none h-64 border-r border-slate-200/90">
                {yTicks.map((val, idx) => (
                  <div key={idx} className="h-0 flex items-center justify-end">
                    <span className="font-mono text-[11px] font-bold text-slate-500 text-right whitespace-nowrap">
                      {formatCurrencyUSD(val, true)}
                    </span>
                  </div>
                ))}
              </div>

              {/* KOLOM KANAN: Garis Kisi Horizontal & Batang-Batang Diagram */}
              <div className="flex-1 min-w-0 relative">
                {/* Garis Horizontal Bersih (Hanya garis pembantu, TANPA angka di sini) */}
                <div className="absolute inset-0 h-64 flex flex-col justify-between pointer-events-none">
                  {yTicks.map((_, idx) => (
                    <div key={idx} className="w-full border-b border-slate-100" />
                  ))}
                </div>

                {/* Jalur Batang Diagram (Tinggi 256px / h-64) */}
                <div className="relative z-10 h-64 flex items-end justify-around gap-2 sm:gap-6 px-3 sm:px-6 border-b-2 border-slate-300">
                  {categorySummaries.map((cat, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;
                    const isOverBudget = cat.status === 'Over Budget';
                    const neutral = cat.status === 'Allocation' || cat.status === 'Pending GL' || cat.status === 'Pending Budget';
                    
                    const budgetHeightPct = barHeight(cat.budget);
                    const actualHeightPct = barHeight(cat.actual);

                    return (
                      <div 
                        key={cat.category}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(prev => prev === idx ? null : idx);
                        }}
                        className="flex-1 max-w-[120px] flex flex-col items-center group cursor-pointer relative h-full justify-end"
                      >
                        {/* Persegi Hitam Informasi Detail (Tooltip Pop-up) */}
                        {isCardOpen && (
                          <div 
                            className={`absolute bottom-full mb-3 z-50 w-64 bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-xs border border-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                              idx === 0 
                                ? 'left-0' 
                                : idx >= categorySummaries.length - 2 
                                ? 'right-0' 
                                : 'left-1/2 -translate-x-1/2'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="font-extrabold text-sm border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
                              <span className="truncate pr-2">{cat.category}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-mono font-medium text-slate-300">
                                  {cat.accountCount} {language === 'ID' ? 'Akun' : 'COA'}
                                </span>
                                {isSelected && (
                                  <button 
                                    onClick={() => setSelectedIndex(null)}
                                    className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 font-mono text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-400">{labels.budgetLegend}:</span>
                                <span className="font-bold">{formatCurrencyUSD(cat.budget)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">{labels.actualLegend}:</span>
                                <span className="font-bold text-blue-300">{formatCurrencyUSD(cat.actual)}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-800">
                                <span className="text-slate-400">{labels.variance}:</span>
                                <span className={`font-bold ${neutral ? 'text-slate-300' : isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {isOverBudget ? '+' : ''}{formatCurrencyUSD(cat.variance)} ({formatPercentage(cat.variancePct, true)})
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">{labels.absorption}:</span>
                                <span className="font-bold">{formatPercentage(cat.absorptionRate)}</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">{labels.status}:</span>
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                neutral ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : cat.status === 'Over Budget'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                  : cat.status === 'Under Budget'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {neutral ? (cat.status === 'Pending Budget' ? (language === 'ID' ? 'Budget belum tersedia' : 'Awaiting Budget') : cat.status === 'Allocation' ? (language === 'ID' ? 'Alokasi' : 'Allocation') : (language === 'ID' ? 'Belum ada GL' : 'Awaiting GL')) : cat.status === 'Over Budget' ? labels.overBudgetLegend : cat.status === 'Under Budget' ? labels.underBudgetLegend : labels.onBudgetLegend}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Pasangan Batang (Budget & Actual) Berdampingan */}
                        <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-full">
                          {/* Batang Budget (Abu-abu) */}
                          <div className="relative w-1/2 max-w-[28px] h-full">
                            {budgetHeightPct > 0 ? (
                              <div 
                                className={`absolute w-full rounded-t-md transition-all duration-300 ${
                                  isCardOpen ? 'bg-slate-400' : 'bg-slate-300'
                                }`}
                                style={barStyle(cat.budget, budgetHeightPct)}
                              />
                            ) : (
                              <div className="absolute w-full h-0.5 bg-slate-200" style={{ bottom: `${zeroPct}%` }} title={language === 'ID' ? 'Anggaran: $0' : 'Budget: $0'} />
                            )}
                          </div>

                          {/* Batang Actual (Biru / Merah) */}
                          <div className="relative w-1/2 max-w-[28px] h-full">
                            {actualHeightPct > 0 ? (
                              <div 
                                className={`absolute w-full rounded-t-md transition-all duration-300 shadow-xs ${
                                  isOverBudget
                                    ? isCardOpen ? 'bg-rose-600' : 'bg-rose-500'
                                    : isCardOpen ? 'bg-blue-700' : 'bg-[#1E5EFF]'
                                }`}
                                style={barStyle(cat.actual, actualHeightPct)}
                              />
                            ) : (
                              <div className="absolute w-full h-0.5 bg-slate-200" style={{ bottom: `${zeroPct}%` }} title={language === 'ID' ? 'Realisasi: $0' : 'Actual: $0'} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Label Kategori (Di Bawah Garis Batang - Tanpa Persentase di Bawahnya Sesuai Permintaan) */}
                <div className="flex items-start justify-around gap-2 sm:gap-6 px-3 sm:px-6 pt-2.5">
                  {categorySummaries.map((cat, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;

                    return (
                      <div key={cat.category} className="flex-1 max-w-[120px] text-center">
                        <p className={`text-xs font-bold truncate transition ${
                          isCardOpen ? 'text-[#1E5EFF]' : 'text-slate-800'
                        }`} title={cat.category}>
                          {cat.category}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Mode */}
        {chartMode === 'monthly' && (
          <div className="w-full">
            <div className="flex items-start w-full">
              {/* KOLOM KIRI KHUSUS: Angka Skala Sumbu Y (Berada di luar area batang) */}
              <div className="w-20 sm:w-24 shrink-0 flex flex-col justify-between items-end pr-3 select-none h-64 border-r border-slate-200/90">
                {yTicks.map((val, idx) => (
                  <div key={idx} className="h-0 flex items-center justify-end">
                    <span className="font-mono text-[11px] font-bold text-slate-500 text-right whitespace-nowrap">
                      {formatCurrencyUSD(val, true)}
                    </span>
                  </div>
                ))}
              </div>

              {/* KOLOM KANAN: Garis Kisi Horizontal & 12 Batang Bulan */}
              <div className="flex-1 min-w-0 relative">
                {/* Garis Horizontal Bersih */}
                <div className="absolute inset-0 h-64 flex flex-col justify-between pointer-events-none">
                  {yTicks.map((_, idx) => (
                    <div key={idx} className="w-full border-b border-slate-100" />
                  ))}
                </div>

                {/* Jalur Batang Bulanan (Tinggi 256px / h-64) */}
                <div className="relative z-10 h-64 flex items-end justify-between gap-1 sm:gap-2 px-2 sm:px-4 border-b-2 border-slate-300">
                  {monthlyData.map((m, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;
                    const isOverBudget = kpiSummary.status !== 'Pending Budget' && m.budget >= 0 && m.actual > m.budget && m.isClosed;
                    const variance = m.actual - m.budget;
                    
                    const budgetHeightPct = barHeight(m.budget);
                    const actualHeightPct = m.isClosed ? barHeight(m.actual) : 0;

                    return (
                      <div 
                        key={m.month}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(prev => prev === idx ? null : idx);
                        }}
                        className="flex-1 flex flex-col items-center group cursor-pointer relative h-full justify-end"
                      >
                        {/* Persegi Hitam Informasi Detail Bulanan */}
                        {isCardOpen && (
                          <div 
                            className={`absolute bottom-full mb-3 z-50 w-56 bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-xs border border-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                              idx <= 1 
                                ? 'left-0' 
                                : idx >= monthlyData.length - 2 
                                ? 'right-0' 
                                : 'left-1/2 -translate-x-1/2'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="font-extrabold text-sm border-b border-slate-700 pb-1 mb-2 flex items-center justify-between">
                              <span>{m.month} 2026</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  m.isClosed ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {m.isClosed ? labels.monthClosed : labels.monthPlanned}
                                </span>
                                {isSelected && (
                                  <button 
                                    onClick={() => setSelectedIndex(null)}
                                    className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1 font-mono text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-400">{labels.budgetLegend}:</span>
                                <span className="font-bold">{formatCurrencyUSD(m.budget)}</span>
                              </div>
                              {m.isClosed ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">{labels.actualLegend}:</span>
                                    <span className="font-bold text-blue-300">{formatCurrencyUSD(m.actual)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-slate-800">
                                    <span className="text-slate-400">{labels.variance}:</span>
                                    <span className={`font-bold ${kpiSummary.status === 'Pending Budget' || m.budget < 0 ? 'text-slate-300' : isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                                      {isOverBudget ? '+' : ''}{formatCurrencyUSD(variance)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-slate-400 text-[10px] italic pt-1">
                                  {labels.monthNotUploaded}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Batang Bulanan (Budget & Actual) */}
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          {/* Budget */}
                          <div className="relative w-1/2 max-w-[14px] h-full">
                            <div 
                              className="absolute w-full rounded-t-xs bg-slate-300 transition-all duration-300"
                              style={barStyle(m.budget, budgetHeightPct)}
                            />
                          </div>

                          {/* Actual */}
                          <div className="relative w-1/2 max-w-[14px] h-full">
                            {m.isClosed ? (
                              <div 
                                className={`absolute w-full rounded-t-xs transition-all duration-300 ${
                                  isOverBudget ? 'bg-rose-500' : 'bg-[#1E5EFF]'
                                }`}
                                style={barStyle(m.actual, actualHeightPct)}
                              />
                            ) : (
                              <div className="w-full h-1 bg-slate-200 rounded-full mb-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Label Bulan Di Bawah Garis */}
                <div className="flex items-start justify-between gap-1 sm:gap-2 px-2 sm:px-4 pt-2.5">
                  {monthlyData.map((m, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;

                    return (
                      <div key={m.month} className="flex-1 text-center">
                        <p className={`text-[11px] font-bold transition ${
                          isCardOpen ? 'text-[#1E5EFF]' : 'text-slate-700'
                        }`}>
                          {m.month}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {m.isClosed ? (language === 'ID' ? 'Tutup' : 'Closed') : '–'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Metrics Row with Dynamic Insights */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 text-slate-600 flex-wrap">
          {highestVarianceCat && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                {language === 'ID' ? 'Varians Tertinggi' : 'Highest Variance'}:{' '}
                <strong className="text-slate-900">{highestVarianceCat.category}</strong>{' '}
                <span className="text-rose-600 font-mono font-bold">
                  ({highestVarianceCat.variance > 0 ? '+' : ''}{formatPercentage(highestVarianceCat.variancePct, true)})
                </span>
              </span>
            </div>
          )}

          {bestDisciplinedCat && (
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {language === 'ID' ? 'Serapan Terhemat' : 'Top Savings'}:{' '}
                <strong className="text-slate-900">{bestDisciplinedCat.category}</strong>{' '}
                <span className="text-emerald-600 font-mono font-bold">
                  ({formatPercentage(bestDisciplinedCat.absorptionRate)})
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {language === 'ID' 
            ? 'Budget & Realisasi disinkronkan secara waktu nyata'
            : 'Budget and Actuals synchronized in real time'}
        </div>
      </div>
    </div>
  );
};
