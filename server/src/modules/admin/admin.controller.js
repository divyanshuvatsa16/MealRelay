import * as adminService from './admin.service.js';

export async function bootstrapAdmin(req, res, next) {
  try {
    const result = await adminService.bootstrapAdmin(req.body);
    res.status(200).json({
      success: true,
      message: 'Administrator account successfully provisioned and secured.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}
