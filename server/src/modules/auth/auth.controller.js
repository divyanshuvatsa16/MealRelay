import * as authService from './auth.service.js';

export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        organization: req.user.organization
          ? {
              id: req.user.organization.id,
              name: req.user.organization.name,
              type: req.user.organization.type,
              approvalStatus: req.user.organization.approvalStatus,
              address: req.user.organization.address,
              locality: req.user.organization.locality,
              membershipRole: req.user.membershipRole
            }
          : null
      }
    });
  } catch (err) {
    next(err);
  }
}
