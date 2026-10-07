import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { ServerUiProvider } from '../src/context/ServerUiProvider';
import { DataContext, useData } from '../src/context/DataContext';
import { Sidebar } from '../src/components/layout/Sidebar';
import { Header } from '../src/components/layout/Header';
import { DashboardView } from '../src/components/dashboard/DashboardView';
import { DashboardKpiCards } from '../src/components/dashboard/DashboardKpiCards';
import { GroupedBarChart } from '../src/components/dashboard/GroupedBarChart';
import { MonthlyMatrixView } from '../src/components/matrix/MonthlyMatrixView';
import { UploadView } from '../src/components/upload/UploadView';
import { AuditTrailView } from '../src/components/audit/AuditTrailView';
import { CoaListView } from '../src/components/coa/CoaListView';
import { UserManagementView } from '../src/components/users/UserManagementView';
import type { UserProfile } from '../src/lib/api';
import { FISCAL_MONTHS, type FiscalMonth } from '../src/types';

const user: UserProfile = { id: 1, username: 'qa', full_name: 'QA', role: 'ADMIN', is_active: true, created_at: '' };
const noop = () => {};
function Fixture({ children }: { children: ReactNode }) {
  const base = useData();
  const coa = { code: '111222333', accountName: 'QA Hardware', category: 'Hardware', department: 'MIS Department', registerSystem: 'SAP ERP' as const, status: 'Active' as const, description: 'QA' };
  const account = { coaCode: coa.code, accountName: coa.accountName, category: coa.category, department: coa.department, budgetYtd: 300, actualYtd: 125, variance: -175, variancePct: -58.33, absorptionRate: 41.67, annualBudget: 1200, projectedYearEnd: 1500, projectedGap: 300, status: 'Under Budget' as const };
  const monthly = { coa, monthlyActuals: Object.fromEntries(FISCAL_MONTHS.map(month => [month, month === 'Jun' ? 125 : null])) as Record<FiscalMonth, number | null>, monthlyBudgets: Object.fromEntries(FISCAL_MONTHS.map(month => [month, 100])) as Record<FiscalMonth, number | null>, ytdActual: 125, ytdBudget: 300, ytdVariance: -175 };
  const data = { ...base, coaList: [coa], selectedFiscalYear: 'FY2027/2028', availableFiscalYears: ['FY2027/2028'], availableCategories: ['Hardware'], loadedMonths: ['Jun' as const], latestClosedMonth: 'Jun' as const, allAccountSummaries: [account], highestAbsorptionList: [account], lowestAbsorptionList: [account], categorySummaries: [{ category: 'Hardware', budget: 300, actual: 125, variance: -175, variancePct: -58.33, absorptionRate: 41.67, accountCount: 1, status: 'Under Budget' as const }], monthlyMatrixRows: [monthly], kpiSummary: { ...base.kpiSummary, totalBudget: 300, totalActual: 125, annualBudget: 1200, variance: -175, status: 'Under Budget' as const } };
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}
function render(children: ReactNode, role: 'ADMIN' | 'USER' = 'ADMIN') {
  return renderToStaticMarkup(<ServerUiProvider user={{ ...user, role }} language="EN" setLanguage={noop} onLogout={noop}><Fixture>{children}</Fixture></ServerUiProvider>);
}
const sidebar = render(<Sidebar activeView="dashboard" setActiveView={noop} collapsed={false} setCollapsed={noop} />);
const order = [...sidebar.matchAll(/id="nav-item-([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(order, ['dashboard', 'matrix', 'upload', 'audit', 'coa', 'users']);
const viewer = render(<Sidebar activeView="dashboard" setActiveView={noop} collapsed={false} setCollapsed={noop} />, 'USER');
assert.match(viewer, /id="nav-item-upload"[^>]*disabled/);
assert.match(viewer, /id="nav-item-users"[^>]*disabled/);
for (const [name, component, marker] of [
  ['header', <Header activeView="dashboard" onOpenRlsModal={noop} />, 'profile-dropdown-btn'],
  ['dashboard', <DashboardView />, 'kpi-variance-card'],
  ['matrix', <MonthlyMatrixView />, 'export-excel-btn'],
  ['upload', <UploadView onNavigateToMatrix={noop} onNavigateToAudit={noop} />, 'upload-wizard-progress'],
  ['audit', <AuditTrailView />, 'audit-header-card'],
  ['coa', <CoaListView />, 'QA Hardware'],
  ['users', <UserManagementView />, 'user-mgmt-header'],
] as const) {
  const html = render(component);
  assert.ok(html.includes(marker), `${name} did not render its legacy content`);
  assert.ok(!html.includes('NaN') && !html.includes('Infinity'), `${name} has invalid values`);
  if (name === 'dashboard') {
    assert.ok(html.includes('FY 2027/2028'));
    assert.ok(html.includes('Q4 (Jan - Mar 2028)'));
  }
  console.log(`${name}: render passed`);
}
const signedChart = render(<GroupedBarChart categorySummaries={[{ category: 'Allocation', budget: -100, actual: -25, variance: 75, variancePct: 75, absorptionRate: 0, accountCount: 1, status: 'Allocation' }]} />);
assert.ok(signedChart.includes('bottom:') && signedChart.includes('-$'), 'negative chart values were omitted');
console.log('Sidebar order, viewer restrictions, dynamic years, and signed chart: passed');
const sharedKpi = render(<DashboardKpiCards />);
assert.ok(render(<DashboardView />).includes(sharedKpi));
assert.ok(render(<AuditTrailView />).includes(sharedKpi), 'Audit and Dashboard KPI differ');
assert.ok(!sidebar.includes('rlsSchema'));
assert.ok(!render(<Header activeView="dashboard" onOpenRlsModal={noop} />).includes('supabase-rls-btn'));
console.log('Shared Audit/Dashboard KPI and removal of Supabase action: passed');

function StatusFixture({ status, annualBudget, children }: { status: 'Allocation' | 'Pending GL' | 'Pending Budget' | 'Over Budget'; annualBudget: number; children: ReactNode }) {
  const base = useData();
  return <DataContext.Provider value={{ ...base, loadedMonths: status === 'Pending GL' ? [] : ['Jun'], kpiSummary: { ...base.kpiSummary, status, totalBudget: annualBudget, annualBudget, variance: 500, projectedGap: 700 } }}>{children}</DataContext.Provider>;
}
for (const status of ['Allocation', 'Pending GL', 'Pending Budget', 'Over Budget'] as const) {
  const html = render(<StatusFixture status={status} annualBudget={status === 'Allocation' ? -100 : status === 'Pending Budget' ? 0 : 100}><DashboardKpiCards /></StatusFixture>);
  const variance = html.slice(html.indexOf('id="kpi-variance-card"'), html.indexOf('id="kpi-projection-card"'));
  if (status === 'Over Budget') assert.ok(variance.includes('text-rose-600'));
  else {
    assert.ok(!variance.includes('rose-') && !variance.includes('emerald-'), `${status} incorrectly signals overspending or savings`);
    assert.ok(variance.includes('text-slate-600'));
  }
  if (status !== 'Over Budget') assert.ok(!html.slice(html.indexOf('id="kpi-projection-card"')).includes('text-rose-600'));
}
assert.ok(!signedChart.includes('text-rose-600'), 'Allocation incorrectly ranked as overspending insight');
console.log('Allocation/pending colors neutral; Over Budget remains red: passed');
