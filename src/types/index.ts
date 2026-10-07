export type UserRole = 'Administrator' | 'Viewer';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Suspended';
  department: string;
  lastLogin: string;
  avatarUrl?: string;
}

export type CoaCategory = 
  | 'Hardware' 
  | 'Software' 
  | 'Network' 
  | 'Consulting' 
  | 'Maintenance' 
  | 'Training'
  | 'SGA'
  | 'Direct'
  | 'Indirect'
  | 'Needs Confirmation'
  | 'Finance & FX'
  | 'Operational'
  | 'Other'
  | (string & {});

export type ITDepartment = 'MIS Department' | string;

export interface CoaItem {
  fiscalYear?: number;
  code: string; // e.g., '752201001' or 'IT-60101'
  accountName: string;
  category: CoaCategory;
  department: ITDepartment;
  registerSystem: 'SAP ERP' | 'Oracle Financials' | 'ServiceNow' | 'Jira Asset' | 'Workday' | 'SAP Core GL' | 'Auto-Detected';
  status: 'Active' | 'Inactive';
  description: string;
  accountPattern?: string; // e.g. '752201001-A7744-*'
  sectionCode?: string; // e.g. 'ME0000', 'COMM00'
  inScope?: boolean; // In MIS/IT Scope? (Yes / No)
  scopeStatus?: string; // e.g. 'Active (In-Scope)', 'Out of scope'
}

// Fiscal Year Apr - Mar Japanese/Indonesian Corporate FY standard
export type FiscalMonth = 
  | 'Apr' | 'May' | 'Jun' 
  | 'Jul' | 'Aug' | 'Sep' 
  | 'Oct' | 'Nov' | 'Dec' 
  | 'Jan' | 'Feb' | 'Mar';

export const FISCAL_MONTHS: FiscalMonth[] = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
];

export interface MonthlyValues {
  Apr?: number;
  May?: number;
  Jun?: number;
  Jul?: number;
  Aug?: number;
  Sep?: number;
  Oct?: number;
  Nov?: number;
  Dec?: number;
  Jan?: number;
  Feb?: number;
  Mar?: number;
}

export interface BudgetRecord {
  id: string;
  fiscalYear: string; // e.g. 'FY2026/2027'
  coaCode: string;
  monthlyBudget: MonthlyValues;
  annualTotal: number;
  updatedAt: string;
  updatedBy: string;
}

export interface GlTransaction {
  id: string;
  fiscalYear: string;
  periodMonth: FiscalMonth;
  coaCode: string;
  actualAmount: number;
  glDocumentNo: string;
  postingDate: string;
  vendorName?: string;
  description?: string;
  uploadBatchId: string;
  accountNumberPattern?: string;
  category?: string;
  department?: string;
  sectionCode?: string;
  currency?: string;
  reference?: string;
}

export type UploadType = 'Budget' | 'Monthly GL';

export interface UploadBatch {
  id: string;
  uploadType: UploadType;
  fiscalYear: string;
  targetMonth?: FiscalMonth; // for Monthly GL
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'Active' | 'Replaced' | 'Cancelled';
  replacedAt?: string;
  replacedBy?: string;
  replaceReason?: string;
  replacedBatchId?: string; // ID of batch that replaced this one
  rowCount: number;
  acceptedRows: number;
  rejectedRows: number;
  totalAmount: number;
  previousTotalAmount?: number;
  
  // Detailed Budget Status for Audit Trail
  budgetStatus?: BudgetStatus;
  isOverBudget?: boolean;
  overBudgetAmount?: number; // In USD ($)
  overBudgetPercentage?: number; // e.g. +7.56%
  targetBudgetAmount?: number; // Target budget in USD
  varianceAmount?: number; // Variance (Actual - Budget)
  overBudgetAccountsCount?: number; // Number of accounts exceeding budget
  topOverBudgetCoa?: {
    code: string;
    accountName: string;
    overAmount: number;
    variancePct: number;
  };
  detailsSummary?: string;
}

export interface AuditNote {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  category: 'Upload' | 'Replacement' | 'Budget Revision' | 'System' | 'Policy';
  relatedBatchId?: string;
  content: string;
}

export type BudgetStatus = 'Over Budget' | 'On Budget' | 'Under Budget' | 'On Track' | 'Allocation' | 'Pending GL' | 'Pending Budget';

export interface BudgetHealthBreakdown {
  totalAccounts: number;
  totalBudget: number;
  totalActual: number;
  
  overBudgetCount: number;
  overBudgetPct: number; // % of accounts
  overBudgetBudgetAmount: number;
  overBudgetActualAmount: number;
  
  onBudgetCount: number;
  onBudgetPct: number; // % of accounts
  onBudgetBudgetAmount: number;
  onBudgetActualAmount: number;
  
  underBudgetCount: number;
  underBudgetPct: number; // % of accounts
  underBudgetBudgetAmount: number;
  underBudgetActualAmount: number;
  
  overallStatus: BudgetStatus;
  overallAbsorption: number;
  overallVariancePct: number;
}

export interface AccountVarianceSummary {
  coaCode: string;
  accountName: string;
  category: CoaCategory;
  department: ITDepartment;
  budgetYtd: number;
  actualYtd: number;
  variance: number; // Actual - Budget
  variancePct: number; // (Variance / Budget) * 100
  absorptionRate: number; // (Actual / Budget) * 100
  annualBudget: number;
  projectedYearEnd: number;
  projectedGap: number;
  status: BudgetStatus;
  
  // Prior Period / Prior Year (YoY) Comparison
  priorYearBudgetYtd?: number;
  priorYearActualYtd?: number;
  priorYearVariance?: number;
  priorYearVariancePct?: number;
  priorYearAbsorptionRate?: number;
  yoyActualGrowthPct?: number; // ((actualYtd - priorActualYtd) / priorActualYtd) * 100
  yoyVarianceDelta?: number; // current variance - prior variance
  yoyTrend?: 'Worsening' | 'Improving' | 'Stable' | 'New Overrun' | 'High Velocity' | 'Lagging';
}

export interface CategorySummary {
  category: CoaCategory;
  budget: number;
  actual: number;
  variance: number;
  variancePct: number;
  absorptionRate: number;
  accountCount: number;
  status: BudgetStatus;
}

export type Language = 'EN' | 'ID';

export type ActiveView = 
  | 'dashboard' 
  | 'matrix' 
  | 'upload' 
  | 'audit' 
  | 'coa' 
  | 'users';
