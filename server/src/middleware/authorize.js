import { ForbiddenError } from '../utils/errors.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Access denied: Authentication required'));
    }

    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(new ForbiddenError(`Access denied: Requires role ${allowedRoles.join(' or ')}`));
  };
}

export function requireApprovedOrganization(expectedType = null) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Access denied: Authentication required'));
    }

    // Admins bypass organization requirements if applicable
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const org = req.user.organization;
    if (!org) {
      return next(new ForbiddenError('User is not associated with an organization'));
    }

    if (expectedType && org.type !== expectedType) {
      return next(new ForbiddenError(`Access restricted to ${expectedType} organizations`));
    }

    if (org.approvalStatus !== 'APPROVED') {
      return next(
        new ForbiddenError(
          `Organization approval required. Current status: ${org.approvalStatus}. You cannot perform this action until approved.`
        )
      );
    }

    next();
  };
}
