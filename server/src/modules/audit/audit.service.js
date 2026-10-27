import prisma from '../../config/prisma.js';

export async function logAuditEvent({
  actorUserId = null,
  donationId = null,
  action,
  previousStatus = null,
  newStatus = null,
  metadata = {},
  tx = null
}) {
  const client = tx || prisma;
  try {
    return await client.auditEvent.create({
      data: {
        actorUserId,
        donationId,
        action,
        previousStatus,
        newStatus,
        metadata
      }
    });
  } catch (err) {
    console.error('Failed to record audit event:', err.message);
    // Don't fail the primary transaction if non-critical audit log fails outside tx
    return null;
  }
}

export async function getAuditEventsForDonation(donationId) {
  return prisma.auditEvent.findMany({
    where: { donationId },
    orderBy: { createdAt: 'desc' },
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
    }
  });
}
