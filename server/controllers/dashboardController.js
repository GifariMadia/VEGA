import { getBudgetDashboard, getActualDashboard, getDashboardSummary, getAuditTrail } from '../services/dashboardService.js';

export async function getBudget(req, res) {
  try {
    const response = await getBudgetDashboard();
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getActual(req, res) {
  try {
    const response = await getActualDashboard();
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getSummary(req, res) {
  try {
    const response = await getDashboardSummary();
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getAudit(req, res) {
  try {
    const response = await getAuditTrail();
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getOverview(req, res) {
  try {
    const [budget, actual, summary, audit] = await Promise.all([
      getBudgetDashboard(),
      getActualDashboard(),
      getDashboardSummary(),
      getAuditTrail(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        budget,
        actual,
        summary,
        audit,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getBudget,
  getActual,
  getSummary,
  getAudit,
  getOverview,
};
