import * as orgService from './organization.service.js';

export async function listOrganizations(req, res, next) {
  try {
    const result = await orgService.listOrganizations(req.query);
    res.status(200).json({
      success: true,
      data: result.organizations,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrganization(req, res, next) {
  try {
    const org = await orgService.getOrganizationById(req.params.id);
    res.status(200).json({
      success: true,
      data: org
    });
  } catch (err) {
    next(err);
  }
}

export async function updateApproval(req, res, next) {
  try {
    const updated = await orgService.updateOrganizationApproval(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Organization approval status updated',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}
