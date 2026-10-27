import prisma from '../config/prisma.js';
import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    const primaryMembership = user.memberships[0] || null;

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      membershipRole: primaryMembership?.membershipRole || null,
      organization: primaryMembership?.organization || null,
      organizationId: primaryMembership?.organizationId || null
    };

    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        memberships: {
          include: {
            organization: true
          }
        }
      }
    });

    if (user) {
      const primaryMembership = user.memberships[0] || null;
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipRole: primaryMembership?.membershipRole || null,
        organization: primaryMembership?.organization || null,
        organizationId: primaryMembership?.organizationId || null
      };
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
}
