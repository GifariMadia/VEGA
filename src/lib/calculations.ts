import { BudgetStatus, FiscalMonth, FISCAL_MONTHS, BudgetHealthBreakdown, AccountVarianceSummary } from '../types';

/**
 * Calculates Variance = Actual - Budget
 */
export function calculateVariance(actual: number, budget: number): number {
  return actual - budget;
}

/**
 * Calculates Variance % = (Variance / Budget) * 100
 * Prevents division by zero safely
 */
export function calculateVariancePercentage(variance: number, budget: number): number {
  if (!budget || budget === 0) {
    return 0;
  }
  return (variance / budget) * 100;
}

/**
 * Calculates Absorption Rate % = (Actual / Budget) * 100
 * Prevents division by zero safely
 */
export function calculateAbsorptionRate(actual: number, budget: number): number {
  if (!budget || budget <= 0) {
    return actual > 0 ? 999 : 0;
  }
  return (actual / budget) * 100;
}

/**
 * Determines Status based on criteria:
 * - Under Budget < 90%
 * - On Budget 90–110%
 * - Over Budget > 110%
 */
export function determineBudgetStatus(actual: number, budget: number): BudgetStatus {
  if (budget <= 0) {
    return actual > 0 ? 'Over Budget' : 'On Budget';
  }

  const absorption = (actual / budget) * 100;

  // Over Budget: > 110%
  if (absorption > 110) {
    return 'Over Budget';
  }

  // Under Budget: < 90%
  if (absorption < 90) {
    return 'Under Budget';
  }

  // On Budget: 90% - 110%
  return 'On Budget';
}

/**
 * Calculates Budget Health Breakdown (Over Budget, On Budget, Under Budget percentages & counts)
 * As required by SPV for Status Kesehatan Anggaran.
 */
export function calculateBudgetHealthBreakdown(
  accounts: AccountVarianceSummary[],
  totalBudget: number,
  totalActual: number
): BudgetHealthBreakdown {
  const total = accounts.length;
  if (total === 0) {
    const overallStatus = determineBudgetStatus(totalActual, totalBudget);
    const overallAbsorption = calculateAbsorptionRate(totalActual, totalBudget);
    const overallVariancePct = calculateVariancePercentage(totalActual - totalBudget, totalBudget);
    return {
      totalAccounts: 0,
      totalBudget,
      totalActual,
      overBudgetCount: 0,
      overBudgetPct: 0,
      overBudgetBudgetAmount: 0,
      overBudgetActualAmount: 0,
      onBudgetCount: 0,
      onBudgetPct: 0,
      onBudgetBudgetAmount: 0,
      onBudgetActualAmount: 0,
      underBudgetCount: 0,
      underBudgetPct: 0,
      underBudgetBudgetAmount: 0,
      underBudgetActualAmount: 0,
      overallStatus,
      overallAbsorption,
      overallVariancePct
    };
  }

  let overCount = 0;
  let onCount = 0;
  let underCount = 0;

  let overBudgetSum = 0;
  let onBudgetSum = 0;
  let underBudgetSum = 0;

  let overActualSum = 0;
  let onActualSum = 0;
  let underActualSum = 0;

  accounts.forEach((acc) => {
    if (acc.status === 'Over Budget') {
      overCount++;
      overBudgetSum += acc.budgetYtd;
      overActualSum += acc.actualYtd;
    } else if (acc.status === 'Under Budget') {
      underCount++;
      underBudgetSum += acc.budgetYtd;
      underActualSum += acc.actualYtd;
    } else {
      // 'On Budget' or 'On Track'
      onCount++;
      onBudgetSum += acc.budgetYtd;
      onActualSum += acc.actualYtd;
    }
  });

  const overBudgetPct = (overCount / total) * 100;
  const onBudgetPct = (onCount / total) * 100;
  const underBudgetPct = (underCount / total) * 100;

  const overallAbsorption = calculateAbsorptionRate(totalActual, totalBudget);
  const overallVariancePct = calculateVariancePercentage(totalActual - totalBudget, totalBudget);
  const overallStatus = determineBudgetStatus(totalActual, totalBudget);

  return {
    totalAccounts: total,
    totalBudget,
    totalActual,
    overBudgetCount: overCount,
    overBudgetPct,
    overBudgetBudgetAmount: overBudgetSum,
    overBudgetActualAmount: overActualSum,
    onBudgetCount: onCount,
    onBudgetPct,
    onBudgetBudgetAmount: onBudgetSum,
    onBudgetActualAmount: onActualSum,
    underBudgetCount: underCount,
    underBudgetPct,
    underBudgetBudgetAmount: underBudgetSum,
    underBudgetActualAmount: underActualSum,
    overallStatus,
    overallAbsorption,
    overallVariancePct
  };
}

/**
 * Calculates Year-End Projection:
 * If we have elapsed months, annualize the run-rate or use remaining scheduled budget
 * Standard IT model: YTD Actual + Remaining months scheduled budget
 */
export function calculateYearEndProjection(
  ytdActual: number,
  ytdBudget: number,
  annualBudget: number,
  elapsedMonths: number
): { projectedYearEnd: number; projectedGap: number } {
  if (elapsedMonths <= 0) {
    return { projectedYearEnd: annualBudget, projectedGap: 0 };
  }
  
  // Projection method: YTD Actual + ((Annual Budget - YTD Budget) adjusted for current burn trend)
  const remainingMonths = Math.max(0, 12 - elapsedMonths);
  const averageMonthlyActual = ytdActual / elapsedMonths;
  const runRateProjection = ytdActual + (averageMonthlyActual * remainingMonths);
  
  const projectedGap = runRateProjection - annualBudget;
  return {
    projectedYearEnd: runRateProjection,
    projectedGap
  };
}

/**
 * Currency Formatter: USD ($)
 * Displays all financial nominals in US Dollars across the dashboard, charts, upload, and matrix.
 */
export function formatCurrencyUSD(amount: number, compact: boolean = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0';
  }
  
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (compact) {
    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    }
    if (abs > 0 && abs < 10) {
      return `${sign}$${abs.toFixed(2)}`;
    }
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  // Determine decimal fraction digits
  const maxFraction = abs > 0 && abs % 1 !== 0 ? 2 : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maxFraction > 0 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// Global aliases to ensure all components render in USD consistently
export const formatCurrency = formatCurrencyUSD;
export const formatCurrencyIDR = formatCurrencyUSD;

/**
 * Percentage Formatter
 */
export function formatPercentage(val: number, withSign: boolean = false): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return 'n.a.';
  const formatted = val.toFixed(1) + '%';
  if (withSign && val > 0) {
    return '+' + formatted;
  }
  return formatted;
}

/**
 * Helper to get months up to a specific fiscal month
 */
export function getElapsedMonths(upToMonth: FiscalMonth): FiscalMonth[] {
  const index = FISCAL_MONTHS.indexOf(upToMonth);
  if (index === -1) return FISCAL_MONTHS.slice(0, 5); // default Apr-Aug
  return FISCAL_MONTHS.slice(0, index + 1);
}
