import prisma from '../../config/prisma.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { logAuditEvent } from '../audit/audit.service.js';

export async function registerUser({
  name,
  email,
  password,
  organizationName,
  organizationType,
  address,
  locality
}) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existing) {
    throw new ConflictError('An account with this email address already exists');
  }

  const hashedPassword = await hashPassword(password);
  const assignedRole = organizationType === 'DONOR' ? 'DONOR' : 'NGO';

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Organization (Starts as PENDING for both DONOR and NGO)
    const org = await tx.organization.create({
      data: {
        name: organizationName.trim(),
        type: organizationType,
        approvalStatus: 'PENDING',
        address: address.trim(),
        locality: locality.trim()
      }
    });

    // 2. Create User
    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: assignedRole
      }
    });

    // 3. Create Membership
    const membership = await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        membershipRole: 'OWNER'
      }
    });

    // 4. Record Audit Event
    await logAuditEvent({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      metadata: {
        organizationId: org.id,
        organizationType: org.type,
        role: user.role
      },
      tx
    });

    return { user, org, membership };
  });

  const token = signToken({
    userId: result.user.id,
    role: result.user.role,
    organizationId: result.org.id
  });

  return {
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      createdAt: result.user.createdAt
    },
    organization: {
      id: result.org.id,
      name: result.org.name,
      type: result.org.type,
      approvalStatus: result.org.approvalStatus,
      address: result.org.address,
      locality: result.org.locality,
      membershipRole: result.membership.membershipRole
    }
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        include: {
          organization: true
        }
      }
    }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const primaryMembership = user.memberships[0] || null;
  const org = primaryMembership?.organization || null;

  const token = signToken({
    userId: user.id,
    role: user.role,
    organizationId: org?.id || null
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    organization: org
      ? {
          id: org.id,
          name: org.name,
          type: org.type,
          approvalStatus: org.approvalStatus,
          address: org.address,
          locality: org.locality,
          membershipRole: primaryMembership?.membershipRole || 'MEMBER'
        }
      : null
  };
}
