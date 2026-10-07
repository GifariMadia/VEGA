import React, { useState, useMemo } from 'react';
import { 
  TableProperties, 
  Search, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  ArrowUpDown, 
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { FISCAL_MONTHS, FiscalMonth, CoaCategory } from '../../types';
import { formatCurrencyUSD } from '../../lib/calculations';

type MetricMode = 'actuals' | 'budget' | 'variance';

export const MonthlyMatrixView: React.FC = () => {
  const { 
    monthlyMatrixRows, 
    selectedFiscalYear, 
    selectedCategory, 
    setSelectedCategory,
    loadedMonths = [], availableCategories = [],
    latestClosedMonth
  } = useData();

  const { t, language } = useAuth();
  const [metricMode, setMetricMode] = useState<MetricMode>('actuals');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCompact, setDisplayCompact] = useState(true);

  // Filter rows by search and category
  const filteredRows = useMemo(() => {
    return monthlyMatrixRows.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchCode = r.coa.code.toLowerCase().includes(q);
        const matchName = r.coa.accountName.toLowerCase().includes(q);
        const matchDept = r.coa.department.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDept) return false;
      }
      if (selectedCategory !== 'All' && r.coa.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [monthlyMatrixRows, searchQuery, selectedCategory]);

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    const dataForSheet = filteredRows.map((row) => {
      const entry: Record<string, any> = {
        'COA Code': row.coa.code,
        'Account Name': row.coa.accountName,
        'Category': row.coa.category,
        'Department': row.coa.department,
      };

      FISCAL_MONTHS.forEach((m) => {
        let val: number | null = null;
        if (metricMode === 'actuals') {
          val = row.monthlyActuals[m];
        } else if (metricMode === 'budget') {
          val = row.monthlyBudgets[m];
        } else {
          // variance
          const act = row.monthlyActuals[m];
          const bud = row.monthlyBudgets[m] || 0;
          val = act !== null ? act - bud : null;
        }
        entry[m] = val !== null ? val : '–';
      });

      if (metricMode === 'actuals') {
        entry['Total YTD'] = row.ytdActual;
      } else if (metricMode === 'budget') {
        entry['Total YTD'] = row.ytdBudget;
      } else {
        entry['Total YTD'] = row.ytdVariance;
      }

      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Matrix_${selectedFiscalYear.replace('/', '_')}`);
    
    // Auto column widths
    const cols = Object.keys(dataForSheet[0] || {}).map(() => ({ wch: 16 }));
    worksheet['!cols'] = cols;

    XLSX.writeFile(workbook, `VEGA_${selectedFiscalYear}_Matrix_${metricMode}.xlsx`);
  };

  // Helper to format values in matrix cell
  const renderCellValue = (val: number | null, isVariance: boolean = false) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-300 font-normal select-none">–</span>;
    }
    if (val === 0) {
      return <span className="text-slate-400 font-mono">0</span>;
    }

    if (isVariance) {
      const isOver = val > 0;
      return (
        <span className={`font-mono font-semibold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
          {isOver ? '+' : ''}{formatCurrencyUSD(val, displayCompact)}
        </span>
      );
    }

    return (
      <span className="font-mono text-slate-800">
        {formatCurrencyUSD(val, displayCompact)}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Controls and Header Card */}
      <div 
        id="matrix-controls-card"
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Metric mode toggle: Actuals / Budget / Variance */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              id="matrix-mode-actuals"
              onClick={() => setMetricMode('actuals')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metricMode === 'actuals'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.matrixActuals}
            </button>
            <button
              id="matrix-mode-budget"
              onClick={() => setMetricMode('budget')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metricMode === 'budget'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.matrixBudget}
            </button>
            <button
              id="matrix-mode-variance"
              onClick={() => setMetricMode('variance')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metricMode === 'variance'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.matrixVarianceVal}
            </button>
          </div>

          {/* Compact number toggle */}
          <button
            onClick={() => setDisplayCompact(!displayCompact)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 transition cursor-pointer"
          >
            {language === 'ID'
              ? (displayCompact ? 'Satuan Ringkas ($Jt / $Rb)' : 'Angka Penuh USD ($)')
              : (displayCompact ? 'Compact Units ($M / $K)' : 'Full USD ($)')}
          </button>
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="matrix-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.matrixSearchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]"
            />
          </div>

          {/* Export Excel Button */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>
        </div>
      </div>

      {/* Matrix Table Card */}
      <div 
        id="monthly-matrix-table-container"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      >
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              {language === 'ID' 
                ? `Menampilkan ${filteredRows.length} Akun COA` 
                : `Showing ${filteredRows.length} Accounts`}
            </span>
            <span>•</span>
            <span>
              {language === 'ID' ? 'Realisasi tutup buku hingga:' : 'Closed actuals through:'}{' '}
              <strong className="text-slate-800">{loadedMonths.length ? `${latestClosedMonth} ${Number(selectedFiscalYear.slice(2, 6)) + (['Jan', 'Feb', 'Mar'].includes(latestClosedMonth) ? 1 : 0)}` : '-'}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            {language === 'ID' ? 'Data belum tersedia ditandai dengan “–”' : 'Missing data indicated by “–”'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider sticky top-0">
                <th className="py-3 px-3 text-left w-24 sticky left-0 bg-slate-100 z-10">{t.tableCode}</th>
                <th className="py-3 px-3 text-left min-w-[200px] sticky left-24 bg-slate-100 z-10">{t.tableAccount}</th>
                {FISCAL_MONTHS.map((m) => (
                  <th key={m} className="py-3 px-2 text-right min-w-[70px]">
                    {m}
                  </th>
                ))}
                <th className="py-3 px-3 text-right bg-blue-50/70 text-[#1E5EFF] font-bold min-w-[100px]">
                  {t.totalYtd}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 text-xs">
                    {language === 'ID'
                      ? 'Tidak ada akun COA yang cocok dengan pencarian atau filter kategori saat ini.'
                      : 'No accounts matching current search query or category filter.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  let totalYtdVal = 0;
                  if (metricMode === 'actuals') {
                    totalYtdVal = row.ytdActual;
                  } else if (metricMode === 'budget') {
                    totalYtdVal = row.ytdBudget;
                  } else {
                    totalYtdVal = row.ytdVariance;
                  }

                  return (
                    <tr 
                      key={row.coa.code} 
                      className={`hover:bg-blue-50/40 transition group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* Code sticky */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 sticky left-0 bg-inherit z-10 border-r border-slate-100">
                        {row.coa.code}
                      </td>

                      {/* Name sticky */}
                      <td className="py-2.5 px-3 sticky left-24 bg-inherit z-10 border-r border-slate-100">
                        <div className="font-semibold text-slate-900 truncate max-w-[210px]" title={row.coa.accountName}>
                          {row.coa.accountName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {row.coa.category}
                        </div>
                      </td>

                      {/* 12 Months: Apr - Mar */}
                      {FISCAL_MONTHS.map((m) => {
                        let cellVal: number | null = null;
                        if (metricMode === 'actuals') {
                          cellVal = row.monthlyActuals[m];
                        } else if (metricMode === 'budget') {
                          cellVal = row.monthlyBudgets[m];
                        } else {
                          // variance
                          const act = row.monthlyActuals[m];
                          const bud = row.monthlyBudgets[m] || 0;
                          cellVal = act !== null ? act - bud : null;
                        }

                        return (
                          <td key={m} className="py-2.5 px-2 text-right">
                            {renderCellValue(cellVal, metricMode === 'variance')}
                          </td>
                        );
                      })}

                      {/* Total YTD */}
                      <td className="py-2.5 px-3 text-right bg-blue-50/30 font-mono font-bold">
                        {renderCellValue(totalYtdVal, metricMode === 'variance')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
