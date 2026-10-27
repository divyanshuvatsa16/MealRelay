import prisma from '../../config/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} from '../../utils/errors.js';
import { logAuditEvent } from '../audit/audit.service.js';
import { derivePickupCode, hashPickupCode, verifyPickupCode } from '../../utils/crypto.js';

export async function createDonation(donationData, user) {
  // 1. Verify user's organization is an approved DONOR
  if (!user.organization || user.organization.type !== 'DONOR') {
    throw new ForbiddenError('Only DONOR organizations can publish donations');
  }

  if (user.organization.approvalStatus !== 'APPROVED') {
    throw new ForbiddenError(
      `Your organization cannot publish donations while approval status is ${user.organization.approvalStatus}. Approval is required.`
    );
  }

  // 2. Validate pickup deadline is strictly in the future
  const pickupTime = new Date(donationData.pickupDeadline).getTime();
  const now = Date.now();
  if (pickupTime <= now) {
    throw new BadRequestError('Pickup deadline must be in the future');
  }

  // 3. Create donation tied to verified organization
  const donation = await prisma.$transaction(async (tx) => {
    const created = await tx.donation.create({
      data: {
        donorOrganizationId: user.organization.id,
        title: donationData.title.trim(),
        description: donationData.description.trim(),
        quantity: donationData.quantity,
        unit: donationData.unit,
        foodType: donationData.foodType,
        preparedAt: new Date(donationData.preparedAt),
        consumeBy: new Date(donationData.consumeBy),
        pickupDeadline: new Date(donationData.pickupDeadline),
        status: 'OPEN'
      },
      include: {
        donorOrganization: {
          select: {
            id: true,
            name: true,
            locality: true,
            address: true
          }
        }
      }
    });

    await logAuditEvent({
      actorUserId: user.id,
      donationId: created.id,
      action: 'DONATION_CREATED',
      newStatus: 'OPEN',
      metadata: {
        title: created.title,
        quantity: created.quantity,
        unit: created.unit,
        foodType: created.foodType
      },
      tx
    });

    return created;
  });

  return donation;
}

export async function getDonations(query = {}, user = null) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {};

  // Locality filter
  if (query.locality) {
    where.donorOrganization = {
      locality: {
        contains: query.locality.trim(),
        mode: 'insensitive'
      }
    };
  }

  // Food type filter
  if (query.foodType) {
    where.foodType = query.foodType;
  }

  // Active only filter
  if (query.activeOnly === 'true') {
    where.pickupDeadline = {
      gte: new Date()
    };
  }

  // Ownership and Visibility rules
  const isDonorViewingOwn = query.my === 'true' && user?.organization?.type === 'DONOR';
  const isNgoViewingClaims = query.claims === 'true' && user?.organization?.type === 'NGO';

  if (isDonorViewingOwn) {
    where.donorOrganizationId = user.organization.id;
    if (query.status) {
      where.status = query.status;
    }
  } else if (isNgoViewingClaims) {
    where.claimedByOrganizationId = user.organization.id;
    if (query.status) {
      where.status = query.status;
    }
  } else {
    // Discovery feed (default for NGOs, public, or donors browsing general pool)
    if (query.status) {
      if (query.status !== 'OPEN' && user?.role !== 'ADMIN') {
        where.status = 'OPEN';
      } else {
        where.status = query.status;
      }
    } else {
      where.status = 'OPEN';
    }
  }

  const [total, donations] = await Promise.all([
    prisma.donation.count({ where }),
    prisma.donation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { pickupDeadline: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        description: true,
        quantity: true,
        unit: true,
        foodType: true,
        preparedAt: true,
        consumeBy: true,
        pickupDeadline: true,
        status: true,
        createdAt: true,
        donorOrganizationId: true,
        claimedByOrganizationId: true,
        donorOrganization: {
          select: {
            id: true,
            name: true,
            locality: true,
            address: true
          }
        },
        claimedByOrganization: {
          select: {
            id: true,
            name: true,
            locality: true
          }
        }
      }
    })
  ]);

  return {
    data: donations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

export async function getDonationById(id, user = null) {
  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      donorOrganization: {
        select: {
          id: true,
          name: true,
          locality: true,
          address: true
        }
      },
      claimedByOrganization: {
        select: {
          id: true,
          name: true,
          locality: true
        }
      },
      pickupVerification: {
        select: {
          id: true,
          expiresAt: true,
          verifiedAt: true,
          createdAt: true
        }
      },
      auditEvents: {
        select: {
          id: true,
          action: true,
          previousStatus: true,
          newStatus: true,
          createdAt: true,
          actorUser: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!donation) {
    throw new NotFoundError('Donation not found');
  }

  // Access rules:
  // If OPEN -> visible to any authenticated user or approved organization
  // If not OPEN -> only owning donor, claiming NGO, or ADMIN can view
  const isOwner = user?.organizationId === donation.donorOrganizationId;
  const isClaimer = user?.organizationId === donation.claimedByOrganizationId;
  const isAdmin = user?.role === 'ADMIN';

  if (donation.status !== 'OPEN') {
    if (!isOwner && !isClaimer && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view this private donation record');
    }
  }

  // Include pickupCode ONLY for the authorized owning donor when CLAIMED
  let responseData = { ...donation };
  if (isOwner && donation.status === 'CLAIMED' && donation.pickupVerification) {
    responseData.pickupCode = derivePickupCode(
      donation.id,
      donation.pickupVerification.createdAt
    );
  }

  return responseData;
}

export async function updateDonation(id, updateData, user) {
  const existing = await prisma.donation.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new NotFoundError('Donation not found');
  }

  if (existing.status !== 'OPEN') {
    throw new BadRequestError(
      `Cannot edit a donation with status '${existing.status}'. Only OPEN donations can be edited.`
    );
  }

  const isOwner = user?.organizationId === existing.donorOrganizationId;
  const isAdmin = user?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("You do not have permission to modify another organization's donation");
  }

  const prep = updateData.preparedAt ? new Date(updateData.preparedAt) : existing.preparedAt;
  const consume = updateData.consumeBy ? new Date(updateData.consumeBy) : existing.consumeBy;
  const pickup = updateData.pickupDeadline ? new Date(updateData.pickupDeadline) : existing.pickupDeadline;

  if (consume.getTime() <= prep.getTime()) {
    throw new BadRequestError('consumeBy must be later than preparedAt');
  }

  if (pickup.getTime() > consume.getTime()) {
    throw new BadRequestError('pickupDeadline cannot be later than consumeBy');
  }

  if (pickup.getTime() < prep.getTime()) {
    throw new BadRequestError('pickupDeadline cannot be earlier than preparedAt');
  }

  const safeUpdates = {};
  if (updateData.title !== undefined) safeUpdates.title = updateData.title.trim();
  if (updateData.description !== undefined) safeUpdates.description = updateData.description.trim();
  if (updateData.quantity !== undefined) safeUpdates.quantity = updateData.quantity;
  if (updateData.unit !== undefined) safeUpdates.unit = updateData.unit;
  if (updateData.foodType !== undefined) safeUpdates.foodType = updateData.foodType;
  if (updateData.preparedAt !== undefined) safeUpdates.preparedAt = prep;
  if (updateData.consumeBy !== undefined) safeUpdates.consumeBy = consume;
  if (updateData.pickupDeadline !== undefined) safeUpdates.pickupDeadline = pickup;

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.donation.update({
      where: { id },
      data: safeUpdates,
      include: {
        donorOrganization: {
          select: {
            id: true,
            name: true,
            locality: true,
            address: true
          }
        }
      }
    });

    await logAuditEvent({
      actorUserId: user.id,
      donationId: id,
      action: 'DONATION_UPDATED',
      metadata: {
        updatedFields: Object.keys(safeUpdates)
      },
      tx
    });

    return res;
  });

  return updated;
}

/**
 * Atomic Donation Claiming
 * Uses an atomic conditional PostgreSQL update inside a transaction to prevent race conditions.
 */
export async function claimDonation(id, user) {
  // 1. Role and approval validation
  if (!user.organization || user.organization.type !== 'NGO') {
    throw new ForbiddenError('Only NGO organizations can claim donations');
  }

  if (user.organization.approvalStatus !== 'APPROVED') {
    throw new ForbiddenError(
      `Your organization cannot claim donations while approval status is ${user.organization.approvalStatus}. Approval is required.`
    );
  }

  // 2. Initial existence check
  const existing = await prisma.donation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      donorOrganizationId: true,
      pickupDeadline: true,
      title: true
    }
  });

  if (!existing) {
    throw new NotFoundError('Donation not found');
  }

  // Donor cannot claim own donation
  if (existing.donorOrganizationId === user.organization.id) {
    throw new ForbiddenError('An organization cannot claim its own donation');
  }

  // Deadline check
  const now = new Date();
  if (new Date(existing.pickupDeadline).getTime() <= now.getTime()) {
    throw new ConflictError('Cannot claim donation: Pickup deadline has already passed');
  }

  if (existing.status !== 'OPEN') {
    throw new ConflictError(`Cannot claim donation: Current status is ${existing.status} (already claimed, expired, or cancelled)`);
  }

  // 3. Atomic reservation inside single transaction
  const result = await prisma.$transaction(async (tx) => {
    // Atomic conditional update on status = 'OPEN' and pickupDeadline > NOW()
    const updateCount = await tx.donation.updateMany({
      where: {
        id,
        status: 'OPEN',
        pickupDeadline: { gt: now }
      },
      data: {
        status: 'CLAIMED',
        claimedByOrganizationId: user.organization.id
      }
    });

    // If updateCount is 0, another concurrent transaction claimed it first or deadline expired
    if (updateCount.count === 0) {
      throw new ConflictError('Donation is no longer available to claim (already claimed or expired)');
    }

    // Derive deterministic code and compute hash
    const verificationCreatedAt = new Date();
    const code = derivePickupCode(id, verificationCreatedAt);
    const codeHash = hashPickupCode(code);

    // Short expiration period: 24h or donation pickupDeadline, whichever is earlier
    const expiresAt = new Date(
      Math.min(now.getTime() + 24 * 3600 * 1000, new Date(existing.pickupDeadline).getTime())
    );

    // Create PickupVerification record (enforced unique by DB constraint)
    const verification = await tx.pickupVerification.create({
      data: {
        donationId: id,
        codeHash,
        expiresAt,
        attempts: 0,
        createdAt: verificationCreatedAt
      }
    });

    // Write audit event atomically
    await tx.auditEvent.create({
      data: {
        actorUserId: user.id,
        donationId: id,
        action: 'DONATION_CLAIMED',
        previousStatus: 'OPEN',
        newStatus: 'CLAIMED',
        metadata: {
          claimingOrganizationId: user.organization.id,
          claimingOrganizationName: user.organization.name,
          claimedAt: now.toISOString()
        }
      }
    });

    // Fetch updated record with relations
    const updated = await tx.donation.findUnique({
      where: { id },
      include: {
        donorOrganization: {
          select: {
            id: true,
            name: true,
            locality: true,
            address: true
          }
        },
        claimedByOrganization: {
          select: {
            id: true,
            name: true,
            locality: true
          }
        }
      }
    });

    return updated;
  });

  return result;
}

/**
 * Secure Pickup Verification Handshake
 * Validates the submitted pickup code, ensures claiming NGO identity, and transitions to COMPLETED.
 */
export async function verifyPickup(id, submittedCode, user) {
  // 1. Role validation
  if (!user.organization || user.organization.type !== 'NGO') {
    throw new ForbiddenError('Only the claiming NGO organization can verify pickup');
  }

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      pickupVerification: true
    }
  });

  if (!donation) {
    throw new NotFoundError('Donation not found');
  }

  // 2. Status validation
  if (donation.status !== 'CLAIMED') {
    throw new ConflictError(`Cannot verify pickup: Donation status is ${donation.status}. Must be CLAIMED.`);
  }

  // 3. Organization ownership validation
  if (donation.claimedByOrganizationId !== user.organization.id && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only the NGO organization holding this claim can complete pickup verification');
  }

  const verification = donation.pickupVerification;
  if (!verification) {
    throw new ConflictError('No pickup verification record found for this donation');
  }

  if (verification.verifiedAt) {
    throw new ConflictError('Pickup has already been verified and completed');
  }

  const now = new Date();
  if (now.getTime() > new Date(verification.expiresAt).getTime()) {
    throw new ConflictError('Pickup verification code has expired');
  }

  if (verification.attempts >= 5) {
    throw new ConflictError('Maximum verification attempts exceeded. Code has been locked for security.');
  }

  // 4. Code comparison
  const isValid = verifyPickupCode(submittedCode, verification.codeHash);
  if (!isValid) {
    // Record failed attempt
    await prisma.pickupVerification.update({
      where: { donationId: id },
      data: { attempts: { increment: 1 } }
    });
    throw new BadRequestError('Invalid pickup verification code');
  }

  // 5. Atomic state completion
  const completed = await prisma.$transaction(async (tx) => {
    // Conditional transition from CLAIMED to COMPLETED
    const updateResult = await tx.donation.updateMany({
      where: {
        id,
        status: 'CLAIMED'
      },
      data: {
        status: 'COMPLETED'
      }
    });

    if (updateResult.count === 0) {
      throw new ConflictError('Donation is no longer in CLAIMED state');
    }

    // Invalidate code and mark verified
    await tx.pickupVerification.update({
      where: { donationId: id },
      data: {
        verifiedAt: now
      }
    });

    // Write audit event
    await tx.auditEvent.create({
      data: {
        actorUserId: user.id,
        donationId: id,
        action: 'DONATION_COMPLETED',
        previousStatus: 'CLAIMED',
        newStatus: 'COMPLETED',
        metadata: {
          verifiedAt: now.toISOString(),
          verifiedByOrganizationId: user.organization.id
        }
      }
    });

    return tx.donation.findUnique({
      where: { id },
      include: {
        donorOrganization: {
          select: { id: true, name: true, locality: true }
        },
        claimedByOrganization: {
          select: { id: true, name: true, locality: true }
        }
      }
    });
  });

  return completed;
}

/**
 * Explicit Cancellation Rules
 */
export async function cancelDonation(id, reason, user) {
  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      pickupVerification: true
    }
  });

  if (!donation) {
    throw new NotFoundError('Donation not found');
  }

  // Status checks: COMPLETED, EXPIRED, CANCELLED cannot be cancelled
  if (['COMPLETED', 'EXPIRED', 'CANCELLED'].includes(donation.status)) {
    throw new ConflictError(`Cannot cancel a donation that is already ${donation.status}`);
  }

  const isOwner = user?.organizationId === donation.donorOrganizationId;
  const isClaimer = user?.organizationId === donation.claimedByOrganizationId;
  const isAdmin = user?.role === 'ADMIN';

  if (!isOwner && !isClaimer && !isAdmin) {
    throw new ForbiddenError('You do not have permission to cancel this donation');
  }

  // A claiming NGO cannot cancel an OPEN donation
  if (isClaimer && !isOwner && donation.status === 'OPEN') {
    throw new ForbiddenError('Only the owning donor can cancel an open donation');
  }

  const now = new Date();

  const cancelled = await prisma.$transaction(async (tx) => {
    // Atomic conditional update
    const updateResult = await tx.donation.updateMany({
      where: {
        id,
        status: donation.status
      },
      data: {
        status: 'CANCELLED'
      }
    });

    if (updateResult.count === 0) {
      throw new ConflictError('Donation status changed concurrently');
    }

    // Invalidate pickup code if verification exists
    if (donation.pickupVerification) {
      await tx.pickupVerification.updateMany({
        where: { donationId: id },
        data: {
          codeHash: `INVALIDATED_${Date.now()}`,
          expiresAt: now
        }
      });
    }

    // Record audit event
    await tx.auditEvent.create({
      data: {
        actorUserId: user.id,
        donationId: id,
        action: 'DONATION_CANCELLED',
        previousStatus: donation.status,
        newStatus: 'CANCELLED',
        metadata: {
          reason: reason?.trim() || 'No reason provided',
          cancelledByUserId: user.id,
          cancelledByOrganizationId: user.organizationId,
          cancelledByRole: user.role,
          cancelledAt: now.toISOString()
        }
      }
    });

    return tx.donation.findUnique({
      where: { id },
      include: {
        donorOrganization: {
          select: { id: true, name: true, locality: true }
        },
        claimedByOrganization: {
          select: { id: true, name: true, locality: true }
        }
      }
    });
  });

  return cancelled;
}

/**
 * Secure Pickup Code Retrieval
 * Exclusively reveals plaintext code to the owning donor of a CLAIMED donation.
 */
export async function getPickupCode(id, user) {
  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      pickupVerification: true
    }
  });

  if (!donation) {
    throw new NotFoundError('Donation not found');
  }

  const isOwner = user?.organizationId === donation.donorOrganizationId;
  const isAdmin = user?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Only the owning donor organization can access the pickup code');
  }

  if (donation.status !== 'CLAIMED') {
    throw new ConflictError(`Pickup code is only available when donation is CLAIMED. Current status: ${donation.status}`);
  }

  const verification = donation.pickupVerification;
  if (!verification) {
    throw new NotFoundError('Verification record not found');
  }

  if (verification.verifiedAt) {
    throw new ConflictError('Pickup has already been verified and completed');
  }

  const code = derivePickupCode(id, verification.createdAt);

  return {
    donationId: id,
    pickupCode: code,
    expiresAt: verification.expiresAt
  };
}

/**
 * Audit History Timeline
 */
export async function getDonationHistory(id, user) {
  const donation = await prisma.donation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      donorOrganizationId: true,
      claimedByOrganizationId: true
    }
  });

  if (!donation) {
    throw new NotFoundError('Donation not found');
  }

  const isOwner = user?.organizationId === donation.donorOrganizationId;
  const isClaimer = user?.organizationId === donation.claimedByOrganizationId;
  const isAdmin = user?.role === 'ADMIN';
  const isOpenFeed = donation.status === 'OPEN' && user?.organization?.approvalStatus === 'APPROVED';

  if (!isOwner && !isClaimer && !isAdmin && !isOpenFeed) {
    throw new ForbiddenError('You do not have permission to view this donation history');
  }

  const history = await prisma.auditEvent.findMany({
    where: { donationId: id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      previousStatus: true,
      newStatus: true,
      metadata: true,
      createdAt: true,
      actorUser: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  });

  return history;
}
