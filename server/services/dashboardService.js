import { query } from '../db/index.js';

const monthOrder = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

function money(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function tidyMap(map) {
  return Object.entries(map)
    .map(([key, value]) => ({ key, value: Number(value || 0) }))
    .sort((a, b) => b.value - a.value);
}

export async function getBudgetDashboard() {
  const budgetResult = await query('SELECT * FROM get_active_budget_data();');
  const rows = budgetResult.rows || [];

  const summary = {
    totalRows: rows.length,
    totalBudget: 0,
    budgetByMonth: {},
    budgetByCoa: {},
    budgetDetail: [],
  };

  for (const row of rows) {
    const month = row.month || row.period_month || 'Unknown';
    const amount = money(row.amount ?? row.budget_amount ?? row.value ?? 0);
    const coaCode = row.coa_code || row.account_code || row.account || 'Unknown';

    summary.totalBudget += amount;
    summary.budgetByMonth[month] = (summary.budgetByMonth[month] || 0) + amount;
    summary.budgetByCoa[coaCode] = (summary.budgetByCoa[coaCode] || 0) + amount;
    summary.budgetDetail.push({
      id: row.id,
      fiscalYear: row.fiscal_year,
      month,
      coaCode,
      amount,
      batchId: row.upload_batch_id,
    });
  }

  summary.budgetByMonth = Object.fromEntries(
    monthOrder.map((month) => [month, summary.budgetByMonth[month] || 0]).filter(([, value]) => value !== 0)
  );

  return {
    ...summary,
    topAccounts: tidyMap(summary.budgetByCoa).slice(0, 10),
  };
}

export async function getActualDashboard() {
  const activeBatch = await query("SELECT * FROM upload_batches WHERE upload_type = 'Monthly GL' AND status = 'Active' ORDER BY created_at DESC LIMIT 1;");
  const activeBatchRow = activeBatch.rows[0];

  const actual = {
    totalRows: 0,
    totalActual: 0,
    actualByMonth: {},
    actualByCoa: {},
    actualDetail: [],
    activeBatch: activeBatchRow || null,
  };

  if (!activeBatchRow) {
    return actual;
  }

  const response = await query(
    'SELECT * FROM get_active_gl_data($1, $2);',
    [activeBatchRow.fiscal_year, activeBatchRow.target_month || 'All']
  );

  const rows = response.rows || [];

  for (const row of rows) {
    const month = row.month || row.period_month || 'Unknown';
    const amount = money(row.amount ?? row.debit ?? row.credit ?? 0);
    const coaCode = row.coa_code || row.account_code || row.account || 'Unknown';

    actual.totalRows += 1;
    actual.totalActual += amount;
    actual.actualByMonth[month] = (actual.actualByMonth[month] || 0) + amount;
    actual.actualByCoa[coaCode] = (actual.actualByCoa[coaCode] || 0) + amount;
    actual.actualDetail.push({
      id: row.id,
      fiscalYear: row.fiscal_year,
      month,
      coaCode,
      amount,
      batchId: row.upload_batch_id,
      debit: money(row.debit),
      credit: money(row.credit),
    });
  }

  actual.actualByMonth = Object.fromEntries(
    monthOrder.map((month) => [month, actual.actualByMonth[month] || 0]).filter(([, value]) => value !== 0)
  );

  return {
    ...actual,
    topAccounts: tidyMap(actual.actualByCoa).slice(0, 10),
  };
}

export async function getDashboardSummary() {
  const budget = await getBudgetDashboard();
  const actual = await getActualDashboard();
  const combined = Object.keys(budget.budgetByCoa)
    .concat(Object.keys(actual.actualByCoa))
    .filter((value, index, arr) => arr.indexOf(value) === index);

  const varianceByCoa = {};
  for (const coaCode of combined) {
    const b = money(budget.budgetByCoa[coaCode]);
    const a = money(actual.actualByCoa[coaCode]);
    varianceByCoa[coaCode] = a - b;
  }

  const sortedVariance = Object.entries(varianceByCoa)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const summary = {
    totalBudget: budget.totalBudget,
    totalActual: actual.totalActual,
    variance: actual.totalActual - budget.totalBudget,
    utilizationPct: budget.totalBudget ? (actual.totalActual / budget.totalBudget) * 100 : 0,
    budgetByMonth: budget.budgetByMonth,
    actualByMonth: actual.actualByMonth,
    varianceByCoa,
    worstVariance: sortedVariance.slice(0, 10),
    budgetRows: budget.totalRows,
    actualRows: actual.totalRows,
  };

  return summary;
}

export async function getAuditTrail() {
  const uploadBatches = await query('SELECT * FROM upload_batches ORDER BY created_at DESC;');
  const auditNotes = await query('SELECT * FROM audit_notes ORDER BY created_at DESC;');

  return {
    uploadBatches: uploadBatches.rows || [],
    auditNotes: auditNotes.rows || [],
  };
}

export default {
  getBudgetDashboard,
  getActualDashboard,
  getDashboardSummary,
  getAuditTrail,
};
