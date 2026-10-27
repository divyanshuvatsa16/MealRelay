import * as dashboardService from './dashboard.service.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
}
