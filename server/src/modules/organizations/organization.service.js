import prisma from '../../config/prisma.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { logAuditEvent } from '../audit/audit.service.js';

export async function getOrganizationById(id) {
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      approvalStatus: true,
      address: true,
      locality: true,
      createdAt: true
    }
  });

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  return org;
}

export async function listOrganizations({ approvalStatus, type, search, page = 1, limit = 20 } = {}) {
  const where = {};

  if (approvalStatus && ['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
    where.approvalStatus = approvalStatus;
  }

  if (type && ['DONOR', 'NGO'].includes(type)) {
    where.type = type;
  }

  if (search && search.trim()) {
    const query = search.trim();
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { locality: { contains: query, mode: 'insensitive' } },
      { address: { contains: query, mode: 'insensitive' } }
    ];
  }

  const take = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;

  const [total, organizations] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        approvalStatus: true,
        address: true,
        locality: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            membershipRole: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
              }
            }
          }
        },
        _count: {
          select: {
            donationsCreated: true,
            donationsClaimed: true
          }
        }
      }
    })
  ]);

  return {
    organizations,
    pagination: {
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  };
}

export async function updateOrganizationApproval(id, { approvalStatus, reason } = {}, adminUser) {
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approvalStatus)) {
    throw new BadRequestError('Invalid approval status. Must be APPROVED, REJECTED, or PENDING');
  }

  const existing = await prisma.organization.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new NotFoundError('Organization not found');
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: { approvalStatus }
  });

  const metadata = {
    organizationId: id,
    organizationName: existing.name,
    organizationType: existing.type,
    previousStatus: existing.approvalStatus,
    newStatus: approvalStatus
  };

  if (reason && typeof reason === 'string' && reason.trim()) {
    metadata.reason = reason.trim();
  }

  await logAuditEvent({
    actorUserId: adminUser.id,
    action: `ORGANIZATION_${approvalStatus}`,
    metadata
  });

  return updated;
}

