import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('MealRelay Admin Organization Approval & Security Integration Tests', () => {
  let adminToken = '';
  let adminUser = null;
  let donorToken = '';
  let ngoToken = '';

  let testPendingOrg = null;
  let testPendingUser = null;
  let testPendingToken = '';

  beforeAll(async () => {
    // 1. Log in as seeded Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.org', password: 'DemoPass123!' });

    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
    adminUser = adminRes.body.data.user;

    // 2. Log in as seeded Donor
    const donorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor@demo.org', password: 'DemoPass123!' });

    expect(donorRes.status).toBe(200);
    donorToken = donorRes.body.data.token;

    // 3. Log in as seeded NGO
    const ngoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ngo@demo.org', password: 'DemoPass123!' });

    expect(ngoRes.status).toBe(200);
    ngoToken = ngoRes.body.data.token;

    // 4. Register a fresh organization to test approval & rejection lifecycles
    const unique = Date.now();
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Applicant User',
        email: `applicant.${unique}@communityrelief.org`,
        password: 'Password123!',
        organizationName: `Applicant Shelter ${unique}`,
        organizationType: 'NGO',
        address: '77 Hope Boulevard',
        locality: 'Uptown District'
      });

    expect(regRes.status).toBe(201);
    testPendingToken = regRes.body.data.token;
    testPendingUser = regRes.body.data.user;
    testPendingOrg = regRes.body.data.organization;
    expect(testPendingOrg.approvalStatus).toBe('PENDING');
  });

  afterAll(async () => {
    // Clean up created test organization
    if (testPendingOrg?.id) {
      await prisma.auditEvent.deleteMany({
        where: {
          metadata: {
            path: ['organizationId'],
            equals: testPendingOrg.id
          }
        }
      });
      await prisma.organization.deleteMany({
        where: { id: testPendingOrg.id }
      });
    }
    if (testPendingUser?.id) {
      await prisma.user.deleteMany({
        where: { id: testPendingUser.id }
      });
    }
  });

  it('1. GET /api/organizations is rejected with 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. GET /api/organizations is rejected with 403 Forbidden for non-admin roles (DONOR)', async () => {
    const res = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/access denied/i);
  });

  it('3. GET /api/organizations is rejected with 403 Forbidden for non-admin roles (NGO)', async () => {
    const res = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${ngoToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Admin can list organizations with pagination and member contact details', async () => {
    const res = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('approvalStatus');
    expect(first).toHaveProperty('locality');
    expect(first).toHaveProperty('members');
  });

  it('5. Admin can filter organizations by approvalStatus (PENDING)', async () => {
    const res = await request(app)
      .get('/api/organizations?approvalStatus=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every((o) => o.approvalStatus === 'PENDING')).toBe(true);
    const found = res.body.data.find((o) => o.id === testPendingOrg.id);
    expect(found).toBeDefined();
  });

  it('6. Admin can search organizations by name query', async () => {
    const res = await request(app)
      .get(`/api/organizations?search=${encodeURIComponent(testPendingOrg.name)}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(testPendingOrg.id);
  });

  it('7. Non-admin users cannot approve their own or another organization', async () => {
    const res = await request(app)
      .patch(`/api/organizations/${testPendingOrg.id}/approval`)
      .set('Authorization', `Bearer ${testPendingToken}`)
      .send({ approvalStatus: 'APPROVED' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Verify DB was unchanged
    const check = await prisma.organization.findUnique({
      where: { id: testPendingOrg.id }
    });
    expect(check.approvalStatus).toBe('PENDING');
  });

  it('8. Invalid approval status values are rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/organizations/${testPendingOrg.id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approvalStatus: 'SUPER_APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('9. Admin can reject an organization with a recorded reason and audit event', async () => {
    const reasonText = 'Verification documents invalid: Address could not be verified.';
    const res = await request(app)
      .patch(`/api/organizations/${testPendingOrg.id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approvalStatus: 'REJECTED',
        reason: reasonText
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvalStatus).toBe('REJECTED');

    // Verify DB record
    const updated = await prisma.organization.findUnique({
      where: { id: testPendingOrg.id }
    });
    expect(updated.approvalStatus).toBe('REJECTED');

    // Verify Audit Event
    const audit = await prisma.auditEvent.findFirst({
      where: {
        action: 'ORGANIZATION_REJECTED',
        actorUserId: adminUser.id
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(audit).toBeDefined();
    expect(audit.metadata.organizationId).toBe(testPendingOrg.id);
    expect(audit.metadata.reason).toBe(reasonText);
    expect(audit.metadata.previousStatus).toBe('PENDING');
    expect(audit.metadata.newStatus).toBe('REJECTED');
  });

  it('10. Rejected NGO cannot claim donations (403 Forbidden)', async () => {
    // Find an open donation
    const openDonation = await prisma.donation.findFirst({
      where: { status: 'OPEN' }
    });

    if (openDonation) {
      const res = await request(app)
        .post(`/api/donations/${openDonation.id}/claim`)
        .set('Authorization', `Bearer ${testPendingToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Organization approval required|cannot claim/i);
    }
  });

  it('11. Admin can approve a pending/rejected organization with audit event', async () => {
    const res = await request(app)
      .patch(`/api/organizations/${testPendingOrg.id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approvalStatus: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvalStatus).toBe('APPROVED');

    // Verify DB record
    const updated = await prisma.organization.findUnique({
      where: { id: testPendingOrg.id }
    });
    expect(updated.approvalStatus).toBe('APPROVED');

    // Verify Audit Event
    const audit = await prisma.auditEvent.findFirst({
      where: {
        action: 'ORGANIZATION_APPROVED',
        actorUserId: adminUser.id
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(audit).toBeDefined();
    expect(audit.metadata.organizationId).toBe(testPendingOrg.id);
    expect(audit.metadata.previousStatus).toBe('REJECTED');
    expect(audit.metadata.newStatus).toBe('APPROVED');
  });
});
