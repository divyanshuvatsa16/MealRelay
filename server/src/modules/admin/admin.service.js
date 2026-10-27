import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { config } from '../../config/index.js';
import { hashPassword } from '../../utils/password.js';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../../utils/errors.js';

function timingSafeMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function bootstrapAdmin({
  secret,
  email,
  password,
  name,
  organizationName
}) {
  // 1. Verify bootstrap environment configuration exists
  if (!config.adminBootstrapSecret || !config.adminEmail) {
    throw new ForbiddenError(
      'Admin bootstrap is disabled. Required environment configuration (ADMIN_BOOTSTRAP_SECRET / ADMIN_EMAIL) is not configured.'
    );
  }

  // 2. Timing-safe verification of secret and email
  const isSecretValid = timingSafeMatch(secret, config.adminBootstrapSecret);
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = timingSafeMatch(normalizedEmail, config.adminEmail.toLowerCase());

  if (!isSecretValid || !isEmailValid) {
    throw new UnauthorizedError('Invalid administrator bootstrap credentials.');
  }

  // 3. Concurrency-safe atomic transaction
  return prisma.$transaction(async (tx) => {
    // 3a. Check if bootstrap was already executed
    const alreadyBootstrapped = await tx.auditEvent.findFirst({
      where: { action: 'ADMIN_BOOTSTRAP_COMPLETED' }
    });

    if (alreadyBootstrapped) {
      throw new ForbiddenError(
        'Administrator bootstrap has already been completed. This one-time provisioning endpoint is permanently disabled.'
      );
    }

    // 3b. Find existing user matching the admin email
    const existingUser = await tx.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: { organization: true }
        }
      }
    });

    let adminUser;
    let organization;

    if (existingUser) {
      // User exists: update role to ADMIN and optionally update password
      const updateData = { role: 'ADMIN' };
      if (name) updateData.name = name.trim();
      if (password) {
        updateData.passwordHash = await hashPassword(password);
      }

      adminUser = await tx.user.update({
        where: { id: existingUser.id },
        data: updateData
      });

      // Ensure user's organization is approved
      if (existingUser.memberships.length > 0) {
        const primaryOrg = existingUser.memberships[0].organization;
        organization = await tx.organization.update({
          where: { id: primaryOrg.id },
          data: { approvalStatus: 'APPROVED' }
        });
      } else {
        // Create an organization if none exists
        organization = await tx.organization.create({
          data: {
            name: organizationName ? organizationName.trim() : 'MealRelay Operational Hub',
            type: 'NGO',
            approvalStatus: 'APPROVED',
            address: 'Platform Operations Center',
            locality: 'Central Operations'
          }
        });

        await tx.organizationMember.create({
          data: {
            userId: adminUser.id,
            organizationId: organization.id,
            membershipRole: 'OWNER'
          }
        });
      }
    } else {
      // User does not exist: password is mandatory
      if (!password) {
        throw new BadRequestError(
          'Password is required to create a new administrator account.'
        );
      }

      const passwordHash = await hashPassword(password);

      // Create approved organization
      organization = await tx.organization.create({
        data: {
          name: organizationName ? organizationName.trim() : 'MealRelay Operational Hub',
          type: 'NGO',
          approvalStatus: 'APPROVED',
          address: 'Platform Operations Center',
          locality: 'Central Operations'
        }
      });

      // Create Admin User
      adminUser = await tx.user.create({
        data: {
          name: name ? name.trim() : 'System Administrator',
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN'
        }
      });

      // Link membership
      await tx.organizationMember.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          membershipRole: 'OWNER'
        }
      });
    }

    // 3d. Record permanent audit event sealing bootstrap
    await tx.auditEvent.create({
      data: {
        actorUserId: adminUser.id,
        action: 'ADMIN_BOOTSTRAP_COMPLETED',
        metadata: {
          email: adminUser.email,
          userId: adminUser.id,
          organizationId: organization.id,
          bootstrapCompletedAt: new Date().toISOString()
        }
      }
    });

    return {
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      },
      organization: {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        approvalStatus: organization.approvalStatus
      }
    };
  });
}
