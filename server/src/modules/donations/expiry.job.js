import cron from 'node-cron';
import prisma from '../../config/prisma.js';

/**
 * Idempotently processes overdue OPEN donations and transitions them to EXPIRED.
 * Can be invoked directly in automated tests or scheduled via node-cron.
 */
export async function processExpiredDonations() {
  const now = new Date();

  // Find all donations currently OPEN whose pickup deadline has passed
  const overdueDonations = await prisma.donation.findMany({
    where: {
      status: 'OPEN',
      pickupDeadline: { lte: now }
    },
    select: {
      id: true,
      title: true,
      pickupDeadline: true,
      donorOrganizationId: true
    }
  });

  const expiredIds = [];

  for (const item of overdueDonations) {
    try {
      await prisma.$transaction(async (tx) => {
        // Atomic conditional update ensuring status is still strictly OPEN
        const updateResult = await tx.donation.updateMany({
          where: {
            id: item.id,
            status: 'OPEN',
            pickupDeadline: { lte: now }
          },
          data: {
            status: 'EXPIRED'
          }
        });

        // Only create audit event if this worker performed the transition
        if (updateResult.count > 0) {
          await tx.auditEvent.create({
            data: {
              donationId: item.id,
              action: 'DONATION_EXPIRED',
              previousStatus: 'OPEN',
              newStatus: 'EXPIRED',
              metadata: {
                reason: 'Pickup deadline expired before claim reservation',
                pickupDeadline: item.pickupDeadline.toISOString(),
                expiredAt: now.toISOString()
              }
            }
          });

          expiredIds.push(item.id);
        }
      });
    } catch (err) {
      console.error(`[ExpiryJob] Failed to expire donation ${item.id}:`, err.message);
    }
  }

  return {
    evaluatedCount: overdueDonations.length,
    expiredCount: expiredIds.length,
    expiredIds
  };
}

/**
 * Initializes the background expiry job runner.
 * Scheduled to run every minute in standard deployments.
 */
export function initExpiryScheduler() {
  // Run every 2 minutes in background
  const task = cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await processExpiredDonations();
      if (result.expiredCount > 0) {
        console.log(`[ExpiryJob] Successfully transitioned ${result.expiredCount} overdue donation(s) to EXPIRED.`);
      }
    } catch (err) {
      console.error('[ExpiryJob] Unexpected error during scheduled expiration:', err.message);
    }
  });

  return task;
}
