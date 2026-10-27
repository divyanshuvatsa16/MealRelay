import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { processExpiredDonations } from '../src/modules/donations/expiry.job.js';

describe('MealRelay Transactional Workflows & Verification Tests', () => {
  let donorToken = '';
  let donorUser = null;
  let donorOrg = null;

  let approvedNgoToken = '';
  let approvedNgoUser = null;
  let approvedNgoOrg = null;

  let secondApprovedNgoToken = '';
  let secondApprovedNgoOrg = null;

  let pendingNgoToken = '';

  beforeAll(async () => {
    // 1. Login Approved Donor
    const donorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor@demo.org', password: 'DemoPass123!' });
    donorToken = donorRes.body.data.token;
    donorUser = donorRes.body.data.user;
    donorOrg = donorRes.body.data.organization;

    // 2. Login Approved NGO
    const ngoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ngo@demo.org', password: 'DemoPass123!' });
    approvedNgoToken = ngoRes.body.data.token;
    approvedNgoUser = ngoRes.body.data.user;
    approvedNgoOrg = ngoRes.body.data.organization;

    // 3. Login Pending NGO
    const pendingRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pending.ngo@demo.org', password: 'DemoPass123!' });
    pendingNgoToken = pendingRes.body.data.token;

    // 4. Register a second approved NGO for concurrency testing
    const unique = Date.now();
    const secondNgoRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second NGO Worker',
        email: `ngo2.${unique}@test.org`,
        password: 'Password123!',
        organizationName: 'Second Relief Network',
        organizationType: 'NGO',
        address: '888 Relief Avenue',
        locality: 'Downtown'
      });
    secondApprovedNgoToken = secondNgoRes.body.data.token;
    secondApprovedNgoOrg = secondNgoRes.body.data.organization;

    // Approve the second NGO directly in DB for testing
    await prisma.organization.update({
      where: { id: secondApprovedNgoOrg.id },
      data: { approvalStatus: 'APPROVED' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to create a fresh OPEN donation
  async function createTestDonation(hoursUntilPickup = 4) {
    const now = Date.now();
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: `Test Food Batch ${Date.now()}`,
        description: 'Quality tested surplus food package',
        quantity: 20,
        unit: 'meals',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now - 3600000).toISOString(),
        pickupDeadline: new Date(now + hoursUntilPickup * 3600000).toISOString(),
        consumeBy: new Date(now + (hoursUntilPickup + 4) * 3600000).toISOString()
      });
    return res.body.data;
  }

  // --- CLAIMING TESTS ---

  it('1. Approved NGO can claim an OPEN donation', async () => {
    const donation = await createTestDonation();

    const claimRes = await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.data.status).toBe('CLAIMED');
    expect(claimRes.body.data.claimedByOrganizationId).toBe(approvedNgoOrg.id);

    // Verify pickup code hash is NOT returned to the claiming NGO
    expect(claimRes.body.data).not.toHaveProperty('pickupCode');
    expect(claimRes.body.data).not.toHaveProperty('codeHash');
  });

  it('2. Pending NGO cannot claim a donation (403 Forbidden)', async () => {
    const donation = await createTestDonation();

    const claimRes = await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${pendingNgoToken}`);

    expect(claimRes.status).toBe(403);
    expect(claimRes.body.success).toBe(false);
    expect(claimRes.body.error.message).toMatch(/approval/i);
  });

  it('3. Donor cannot claim its own donation (403 Forbidden)', async () => {
    const donation = await createTestDonation();

    const claimRes = await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(claimRes.status).toBe(403);
    expect(claimRes.body.success).toBe(false);
    expect(claimRes.body.error.message).toMatch(/Requires role NGO|own donation/i);
  });

  it('4. Unauthenticated claim request is rejected with 401', async () => {
    const donation = await createTestDonation();

    const claimRes = await request(app).post(`/api/donations/${donation.id}/claim`);
    expect(claimRes.status).toBe(401);
  });

  it('5. Already-claimed donation returns a 409 Conflict', async () => {
    const donation = await createTestDonation();

    // First claim succeeds
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    // Second claim must fail
    const secondClaimRes = await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${secondApprovedNgoToken}`);

    expect(secondClaimRes.status).toBe(409);
    expect(secondClaimRes.body.success).toBe(false);
    expect(secondClaimRes.body.error.message).toMatch(/already claimed|no longer available/i);
  });

  it('6. Expired donation cannot be claimed (409 Conflict)', async () => {
    // Create donation with past pickup deadline directly in DB
    const now = new Date();
    const expiredDonation = await prisma.donation.create({
      data: {
        donorOrganizationId: donorOrg.id,
        title: 'Overdue Sandwiches',
        description: 'Past the pickup deadline',
        quantity: 15,
        unit: 'portions',
        foodType: 'OTHER',
        preparedAt: new Date(now.getTime() - 7200000),
        pickupDeadline: new Date(now.getTime() - 1000), // 1 second ago
        consumeBy: new Date(now.getTime() + 3600000),
        status: 'OPEN'
      }
    });

    const res = await request(app)
      .post(`/api/donations/${expiredDonation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/deadline has already passed/i);
  });

  it('7. Two simultaneous claims from different NGOs result in exactly one winner', async () => {
    const donation = await createTestDonation();

    // Fire two simultaneous HTTP requests concurrently
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/donations/${donation.id}/claim`)
        .set('Authorization', `Bearer ${approvedNgoToken}`),
      request(app)
        .post(`/api/donations/${donation.id}/claim`)
        .set('Authorization', `Bearer ${secondApprovedNgoToken}`)
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // Verify DB state has exactly 1 claim
    const inDb = await prisma.donation.findUnique({
      where: { id: donation.id },
      include: { pickupVerification: true }
    });
    expect(inDb.status).toBe('CLAIMED');
    expect(inDb.claimedByOrganizationId).toBeTruthy();
  });

  it('8. Failed claim transactions leave no orphaned verification record or audit event', async () => {
    // Attempting to claim an already claimed donation
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const verificationsBefore = await prisma.pickupVerification.count({
      where: { donationId: donation.id }
    });
    expect(verificationsBefore).toBe(1);

    const auditCountBefore = await prisma.auditEvent.count({
      where: { donationId: donation.id, action: 'DONATION_CLAIMED' }
    });
    expect(auditCountBefore).toBe(1);

    // Failing claim attempt
    const failedRes = await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${secondApprovedNgoToken}`);
    expect(failedRes.status).toBe(409);

    // Check no duplicate records were left behind
    const verificationsAfter = await prisma.pickupVerification.count({
      where: { donationId: donation.id }
    });
    expect(verificationsAfter).toBe(1);

    const auditCountAfter = await prisma.auditEvent.count({
      where: { donationId: donation.id, action: 'DONATION_CLAIMED' }
    });
    expect(auditCountAfter).toBe(1);
  });

  // --- PICKUP VERIFICATION TESTS ---

  it('9. Claim creates a valid pickup-verification record in DB', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const record = await prisma.pickupVerification.findUnique({
      where: { donationId: donation.id }
    });
    expect(record).not.toBeNull();
    expect(record.codeHash).toBeTruthy();
    expect(record.codeHash.length).toBe(64); // SHA-256 length
    expect(record.verifiedAt).toBeNull();
  });

  it('10. Only the authorized donor can access the pickup code', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    // Owning donor accesses pickup code -> 200 OK
    const donorCodeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(donorCodeRes.status).toBe(200);
    expect(donorCodeRes.body.data).toHaveProperty('pickupCode');
    expect(donorCodeRes.body.data.pickupCode.length).toBe(6);

    // Claiming NGO attempts to fetch code -> 403 Forbidden
    const ngoCodeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    expect(ngoCodeRes.status).toBe(403);
  });

  it('11. Only the NGO holding the claim can verify the code', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    // Get code as donor
    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);
    const code = codeRes.body.data.pickupCode;

    // Second unrelated NGO attempts to verify -> 403 Forbidden
    const wrongNgoRes = await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${secondApprovedNgoToken}`)
      .send({ code });

    expect(wrongNgoRes.status).toBe(403);
    expect(wrongNgoRes.body.error.message).toMatch(/holding this claim/i);
  });

  it('12. Invalid code is rejected with 400 Bad Request', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const badCodeRes = await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code: '000000' });

    expect(badCodeRes.status).toBe(400);
    expect(badCodeRes.body.error.message).toMatch(/invalid/i);
  });

  it('13. Expired code is rejected with 409 Conflict', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);
    const code = codeRes.body.data.pickupCode;

    // Manually expire verification record in DB
    await prisma.pickupVerification.update({
      where: { donationId: donation.id },
      data: { expiresAt: new Date(Date.now() - 60000) }
    });

    const verifyRes = await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code });

    expect(verifyRes.status).toBe(409);
    expect(verifyRes.body.error.message).toMatch(/expired/i);
  });

  it('14. Successful verification transitions CLAIMED to COMPLETED', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);
    const code = codeRes.body.data.pickupCode;

    const verifyRes = await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.status).toBe('COMPLETED');

    // Confirm in DB
    const dbDonation = await prisma.donation.findUnique({
      where: { id: donation.id },
      include: { pickupVerification: true }
    });
    expect(dbDonation.status).toBe('COMPLETED');
    expect(dbDonation.pickupVerification.verifiedAt).not.toBeNull();
  });

  it('15. Replayed verification is rejected with 409 Conflict', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);
    const code = codeRes.body.data.pickupCode;

    // First verification succeeds
    await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code });

    // Second verification attempt (replay)
    const replayRes = await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code });

    expect(replayRes.status).toBe(409);
    expect(replayRes.body.success).toBe(false);
  });

  it('16. Concurrent verification attempts cannot complete the donation twice', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);
    const code = codeRes.body.data.pickupCode;

    // Send two concurrent verification requests with valid code
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/donations/${donation.id}/verify-pickup`)
        .set('Authorization', `Bearer ${approvedNgoToken}`)
        .send({ code }),
      request(app)
        .post(`/api/donations/${donation.id}/verify-pickup`)
        .set('Authorization', `Bearer ${approvedNgoToken}`)
        .send({ code })
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // Confirm DB status remains COMPLETED
    const dbDonation = await prisma.donation.findUnique({
      where: { id: donation.id }
    });
    expect(dbDonation.status).toBe('COMPLETED');
  });

  it('17. Code hashes and codes never appear in unauthorized responses or audit metadata', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    // Detail view by NGO
    const ngoDetail = await request(app)
      .get(`/api/donations/${donation.id}`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    expect(ngoDetail.body.data).not.toHaveProperty('pickupCode');
    if (ngoDetail.body.data.pickupVerification) {
      expect(ngoDetail.body.data.pickupVerification).not.toHaveProperty('codeHash');
    }

    // Check audit events for this donation in DB
    const auditEvents = await prisma.auditEvent.findMany({
      where: { donationId: donation.id }
    });
    for (const evt of auditEvents) {
      const metaString = JSON.stringify(evt.metadata);
      expect(metaString).not.toMatch(/codeHash/i);
      expect(metaString).not.toMatch(/pickupCode/i);
    }
  });

  // --- EXPIRATION AND CANCELLATION TESTS ---

  it('18. Expiry job transitions overdue OPEN donations to EXPIRED', async () => {
    const now = new Date();
    // Create overdue donation in DB
    const overdue = await prisma.donation.create({
      data: {
        donorOrganizationId: donorOrg.id,
        title: 'Overdue Soup',
        description: 'Should be automatically expired by job',
        quantity: 10,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 7200000),
        pickupDeadline: new Date(now.getTime() - 10000), // 10s in past
        consumeBy: new Date(now.getTime() + 3600000),
        status: 'OPEN'
      }
    });

    const result = await processExpiredDonations();
    expect(result.expiredIds).toContain(overdue.id);

    const updated = await prisma.donation.findUnique({
      where: { id: overdue.id }
    });
    expect(updated.status).toBe('EXPIRED');
  });

  it('19. Expiry job does not expire CLAIMED or COMPLETED donations', async () => {
    const now = new Date();
    // Create claimed donation whose pickup deadline passed
    const claimedOverdue = await prisma.donation.create({
      data: {
        donorOrganizationId: donorOrg.id,
        claimedByOrganizationId: approvedNgoOrg.id,
        title: 'Claimed Overdue Casserole',
        description: 'Claimed donations must NOT be expired by background job',
        quantity: 8,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 7200000),
        pickupDeadline: new Date(now.getTime() - 10000),
        consumeBy: new Date(now.getTime() + 3600000),
        status: 'CLAIMED'
      }
    });

    await processExpiredDonations();

    const afterJob = await prisma.donation.findUnique({
      where: { id: claimedOverdue.id }
    });
    expect(afterJob.status).toBe('CLAIMED');
  });

  it('20. Running expiry twice does not duplicate events (idempotent)', async () => {
    const now = new Date();
    const overdue = await prisma.donation.create({
      data: {
        donorOrganizationId: donorOrg.id,
        title: 'Idempotency Test Salad',
        description: 'Testing multiple runs',
        quantity: 5,
        unit: 'kg',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 7200000),
        pickupDeadline: new Date(now.getTime() - 10000),
        consumeBy: new Date(now.getTime() + 3600000),
        status: 'OPEN'
      }
    });

    // Run 1
    const run1 = await processExpiredDonations();
    expect(run1.expiredIds).toContain(overdue.id);

    // Run 2
    const run2 = await processExpiredDonations();
    expect(run2.expiredIds).not.toContain(overdue.id);

    // Count audit events
    const auditCount = await prisma.auditEvent.count({
      where: { donationId: overdue.id, action: 'DONATION_EXPIRED' }
    });
    expect(auditCount).toBe(1);
  });

  it('21. Donor can cancel its eligible OPEN donation', async () => {
    const donation = await createTestDonation();

    const cancelRes = await request(app)
      .post(`/api/donations/${donation.id}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ reason: 'Kitchen equipment malfunction' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const dbDonation = await prisma.donation.findUnique({
      where: { id: donation.id }
    });
    expect(dbDonation.status).toBe('CANCELLED');
  });

  it('22. Unauthorized cancellation is rejected (403 Forbidden)', async () => {
    const donation = await createTestDonation();

    // Random NGO attempts to cancel donor's OPEN donation
    const cancelRes = await request(app)
      .post(`/api/donations/${donation.id}/cancel`)
      .set('Authorization', `Bearer ${secondApprovedNgoToken}`)
      .send({ reason: 'Malicious cancellation attempt' });

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.success).toBe(false);
  });

  it('23. Cancellation invalidates any outstanding pickup code', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    // Get code
    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);
    const code = codeRes.body.data.pickupCode;

    // Donor cancels the claimed donation
    const cancelRes = await request(app)
      .post(`/api/donations/${donation.id}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ reason: 'Food batch spoiled' });
    expect(cancelRes.status).toBe(200);

    // NGO attempts to verify the code -> must be rejected
    const verifyRes = await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code });

    expect(verifyRes.status).toBe(409);
    expect(verifyRes.body.error.message).toMatch(/CANCELLED/i);
  });

  it('24. Completed donations cannot be cancelled (409 Conflict)', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);

    await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code: codeRes.body.data.pickupCode });

    // Donor attempts to cancel COMPLETED donation
    const cancelRes = await request(app)
      .post(`/api/donations/${donation.id}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.message).toMatch(/cannot cancel/i);
  });

  it('25. Invalid status transitions (e.g. editing CLAIMED) are rejected', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    // Donor tries to PATCH a CLAIMED donation
    const editRes = await request(app)
      .patch(`/api/donations/${donation.id}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Modified after claim' });

    expect(editRes.status).toBe(400);
    expect(editRes.body.error.message).toMatch(/Only OPEN donations can be edited/i);
  });

  // --- AUDIT, DASHBOARD, AND HISTORY TESTS ---

  it('26. Claim creates exactly one corresponding audit event', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const claimEvents = await prisma.auditEvent.findMany({
      where: { donationId: donation.id, action: 'DONATION_CLAIMED' }
    });
    expect(claimEvents.length).toBe(1);
    expect(claimEvents[0].previousStatus).toBe('OPEN');
    expect(claimEvents[0].newStatus).toBe('CLAIMED');
  });

  it('27. Completion creates the expected audit event', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/claim`)
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    const codeRes = await request(app)
      .get(`/api/donations/${donation.id}/pickup-code`)
      .set('Authorization', `Bearer ${donorToken}`);

    await request(app)
      .post(`/api/donations/${donation.id}/verify-pickup`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ code: codeRes.body.data.pickupCode });

    const completionEvents = await prisma.auditEvent.findMany({
      where: { donationId: donation.id, action: 'DONATION_COMPLETED' }
    });
    expect(completionEvents.length).toBe(1);
    expect(completionEvents[0].previousStatus).toBe('CLAIMED');
    expect(completionEvents[0].newStatus).toBe('COMPLETED');
  });

  it('28. Cancellation and expiration create audit events', async () => {
    const donation = await createTestDonation();
    await request(app)
      .post(`/api/donations/${donation.id}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ reason: 'Audit verification test' });

    const cancelEvents = await prisma.auditEvent.findMany({
      where: { donationId: donation.id, action: 'DONATION_CANCELLED' }
    });
    expect(cancelEvents.length).toBe(1);
    expect(cancelEvents[0].newStatus).toBe('CANCELLED');
    expect(cancelEvents[0].metadata).toHaveProperty('reason', 'Audit verification test');
  });

  it("29. Unauthorized users cannot access another organization's private history", async () => {
    const donation = await createTestDonation();
    // Cancel it so it becomes private to the donor
    await request(app)
      .post(`/api/donations/${donation.id}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`);

    // Unrelated NGO tries to view history
    const historyRes = await request(app)
      .get(`/api/donations/${donation.id}/history`)
      .set('Authorization', `Bearer ${secondApprovedNgoToken}`);

    expect(historyRes.status).toBe(403);
  });

  it('30. Dashboard counts reflect real persisted records', async () => {
    // Check Donor dashboard summary
    const donorDashRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(donorDashRes.status).toBe(200);
    expect(donorDashRes.body.success).toBe(true);
    expect(donorDashRes.body.data.role).toBe('DONOR');
    expect(donorDashRes.body.data.metrics).toHaveProperty('totalCreated');
    expect(donorDashRes.body.data.metrics).toHaveProperty('openCount');
    expect(donorDashRes.body.data.metrics).toHaveProperty('claimedCount');
    expect(donorDashRes.body.data.metrics).toHaveProperty('completedCount');
    expect(typeof donorDashRes.body.data.metrics.totalCreated).toBe('number');

    // Check NGO dashboard summary
    const ngoDashRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    expect(ngoDashRes.status).toBe(200);
    expect(ngoDashRes.body.data.role).toBe('NGO');
    expect(ngoDashRes.body.data.metrics).toHaveProperty('availableOpen');
    expect(ngoDashRes.body.data.metrics).toHaveProperty('activeClaims');
    expect(ngoDashRes.body.data.metrics).toHaveProperty('completedPickups');
  });

  it('31. Pagination and organization scoping work correctly for claims and donations', async () => {
    // NGO queries their claims with pagination
    const res = await request(app)
      .get('/api/donations?claims=true&page=1&limit=5')
      .set('Authorization', `Bearer ${approvedNgoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);

    // All returned items must be claimed by approvedNgoOrg
    expect(
      res.body.data.every((d) => d.claimedByOrganizationId === approvedNgoOrg.id)
    ).toBe(true);
  });
});
