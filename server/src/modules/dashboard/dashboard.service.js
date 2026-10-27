import prisma from '../../config/prisma.js';

export async function getDashboardSummary(user) {
  const role = user?.role;
  const orgId = user?.organizationId;

  if (role === 'DONOR' || user?.organization?.type === 'DONOR') {
    // Donor metrics
    const [totalCreated, openCount, claimedCount, completedCount, expiredCount, cancelledCount] =
      await Promise.all([
        prisma.donation.count({ where: { donorOrganizationId: orgId } }),
        prisma.donation.count({ where: { donorOrganizationId: orgId, status: 'OPEN' } }),
        prisma.donation.count({ where: { donorOrganizationId: orgId, status: 'CLAIMED' } }),
        prisma.donation.count({ where: { donorOrganizationId: orgId, status: 'COMPLETED' } }),
        prisma.donation.count({ where: { donorOrganizationId: orgId, status: 'EXPIRED' } }),
        prisma.donation.count({ where: { donorOrganizationId: orgId, status: 'CANCELLED' } })
      ]);

    return {
      role: 'DONOR',
      organizationId: orgId,
      metrics: {
        totalCreated,
        openCount,
        claimedCount,
        completedCount,
        expiredCount,
        cancelledCount
      }
    };
  }

  if (role === 'NGO' || user?.organization?.type === 'NGO') {
    // NGO metrics
    const now = new Date();
    const [availableOpen, activeClaims, completedPickups, cancelledClaims] = await Promise.all([
      prisma.donation.count({
        where: {
          status: 'OPEN',
          pickupDeadline: { gt: now }
        }
      }),
      prisma.donation.count({
        where: {
          claimedByOrganizationId: orgId,
          status: 'CLAIMED'
        }
      }),
      prisma.donation.count({
        where: {
          claimedByOrganizationId: orgId,
          status: 'COMPLETED'
        }
      }),
      prisma.donation.count({
        where: {
          claimedByOrganizationId: orgId,
          status: 'CANCELLED'
        }
      })
    ]);

    return {
      role: 'NGO',
      organizationId: orgId,
      metrics: {
        availableOpen,
        activeClaims,
        completedPickups,
        cancelledClaims
      }
    };
  }

  // Admin / General fallback metrics
  const [totalDonations, openDonations, claimedDonations, completedDonations] = await Promise.all([
    prisma.donation.count(),
    prisma.donation.count({ where: { status: 'OPEN' } }),
    prisma.donation.count({ where: { status: 'CLAIMED' } }),
    prisma.donation.count({ where: { status: 'COMPLETED' } })
  ]);

  return {
    role: 'ADMIN',
    metrics: {
      totalDonations,
      openDonations,
      claimedDonations,
      completedDonations
    }
  };
}
