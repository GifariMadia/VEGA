import { createContext, useContext } from 'react';
import type { CoaItem, BudgetRecord, GlTransaction, UploadBatch, AuditNote, FiscalMonth, CategorySummary, AccountVarianceSummary, UploadType, BudgetStatus, BudgetHealthBreakdown } from '../types';

export interface ParsedGlCommitRecord {
  coaCode: string;
  amount: number;
  description?: string;
  docNo?: string;
  vendor?: string;
  postingDate?: string;
  periodMonth?: FiscalMonth;
  category?: string;
  department?: string;
  sectionCode?: string;
  currency?: string;
  accountNumberPattern?: string;
}

export interface DataContextType {
  coaList: CoaItem[];
  addCoas: (newCoas: CoaItem[]) => void;
  addNewCoa: (newCoa: CoaItem, initialBudgetAnnual?: number) => { success: boolean; message: string } | Promise<{ success: boolean; message: string }>;
  availableFiscalYears?: string[];
  availableCategories?: string[];
  loadedMonths?: FiscalMonth[];
  budgets: BudgetRecord[];
  glTransactions: GlTransaction[];
  uploads: UploadBatch[];
  auditNotes: AuditNote[];
  
  // Filters
  selectedFiscalYear: string;
  setSelectedFiscalYear: (fy: string) => void;
  selectedQuarter: string;
  setSelectedQuarter: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;

  // Analytical summaries
  latestClosedMonth: FiscalMonth;
  kpiSummary: {
    totalBudget: number;
    totalActual: number;
    variance: number;
    variancePct: number;
    status: BudgetStatus;
    annualBudget: number;
    projectedYearEnd: number;
    projectedGap: number;
    absorptionRate: number;
    healthBreakdown: BudgetHealthBreakdown;
  };
  categorySummaries: CategorySummary[];
  worstCoaList: AccountVarianceSummary[];
  highestAbsorptionList: AccountVarianceSummary[];
  lowestAbsorptionList: AccountVarianceSummary[];
  allAccountSummaries: AccountVarianceSummary[];
  priorFiscalYear?: string;
  
  // Matrix data
  monthlyMatrixRows: Array<{
    coa: CoaItem;
    monthlyActuals: Record<FiscalMonth, number | null>;
    monthlyBudgets: Record<FiscalMonth, number | null>;
    ytdActual: number;
    ytdBudget: number;
    ytdVariance: number;
  }>;

  // Upload Actions
  checkPeriodCollision: (type: UploadType, fiscalYear: string, month?: FiscalMonth) => UploadBatch | null;
  commitUpload: (params: {
    uploadType: UploadType;
    fiscalYear: string;
    targetMonth?: FiscalMonth;
    fileName: string;
    fileSize: string;
    rowCount: number;
    acceptedRows: number;
    rejectedRows: number;
    totalAmount: number;
    replaceReason?: string;
    parsedGlRecords?: ParsedGlCommitRecord[];
    parsedBudgetRecords?: Array<{ coaCode: string; monthly: Record<FiscalMonth, number>; annual: number }>;
    newCoas?: CoaItem[];
  }) => { 
    success: boolean; 
    batchId: string;
    isOverBudget?: boolean;
    budgetStatus?: BudgetStatus;
    overBudgetAmount?: number;
    overBudgetPercentage?: number;
    varianceAmount?: number;
    targetBudgetAmount?: number;
    overBudgetAccountsCount?: number;
    topOverBudgetCoa?: {
      code: string;
      accountName: string;
      overAmount: number;
      variancePct: number;
    };
    detailsSummary?: string;
  };
  refreshDashboard: () => Promise<void>;
  isApiLoading: boolean;

  // Audit Actions
  appendAuditNote: (content: string, category: 'Upload' | 'Replacement' | 'Budget Revision' | 'System' | 'Policy', relatedBatchId?: string) => void;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
