import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { config } from '../src/config/index.js';

describe('MealRelay Administrator Bootstrap Integration Tests', () => {
  const testAdminEmail = config.adminEmail || 'admin.bootstrap@mealrelay.org';
  const testBootstrapSecret = config.adminBootstrapSecret || 'test-super-secret-bootstrap-token-value-2026';
  const testAdminPassword = 'StrongAdminPass2026!';

  // Clean up any test state before and after tests
  async function cleanup() {
    await prisma.auditEvent.deleteMany({
      where: { action: 'ADMIN_BOOTSTRAP_COMPLETED' }
    });

    const user = await prisma.user.findUnique({
      where: { email: testAdminEmail },
      include: { memberships: true }
    });

    if (user) {
      for (const m of user.memberships) {
        await prisma.organizationMember.deleteMany({ where: { userId: user.id } });
        await prisma.organization.deleteMany({ where: { id: m.organizationId } }).catch(() => {});
      }
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  }

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it('1. Rejects bootstrap when secret is invalid (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: 'invalid-secret-value-wrong',
        email: testAdminEmail,
        password: testAdminPassword
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid administrator bootstrap credentials');
  });

  it('2. Rejects bootstrap when email does not match configured ADMIN_EMAIL (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: testBootstrapSecret,
        email: 'unauthorized-intruder@evil.org',
        password: testAdminPassword
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid administrator bootstrap credentials');
  });

  it('3. Rejects bootstrap when creating a new user without a password (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: testBootstrapSecret,
        email: testAdminEmail
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Password is required');
  });

  it('4. Successfully bootstraps a new administrator account when valid secret and email are provided', async () => {
    const res = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: testBootstrapSecret,
        email: testAdminEmail,
        password: testAdminPassword,
        name: 'Chief Operations Officer',
        organizationName: 'MealRelay Headquarters'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('successfully provisioned');
    expect(res.body.data.user.email).toBe(testAdminEmail);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.organization.approvalStatus).toBe('APPROVED');

    // Security verification: NEVER expose password, hash, or secret
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.secret).toBeUndefined();

    // Verify DB state
    const createdUser = await prisma.user.findUnique({
      where: { email: testAdminEmail },
      include: { memberships: { include: { organization: true } } }
    });
    expect(createdUser).toBeDefined();
    expect(createdUser.role).toBe('ADMIN');
    expect(createdUser.memberships.length).toBe(1);
    expect(createdUser.memberships[0].organization.approvalStatus).toBe('APPROVED');

    // Verify permanent AuditEvent is recorded
    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'ADMIN_BOOTSTRAP_COMPLETED', actorUserId: createdUser.id }
    });
    expect(audit).toBeDefined();
  });

  it('5. Second bootstrap attempt is rejected with 403 Forbidden because bootstrap is permanently completed', async () => {
    const res = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: testBootstrapSecret,
        email: testAdminEmail,
        password: testAdminPassword
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already been completed');
  });

  it('6. The bootstrapped admin can log in and receives an ADMIN JWT session', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdminEmail,
        password: testAdminPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');

    // Verify admin can access protected admin-only endpoints
    const adminAccessRes = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${res.body.data.token}`);

    expect(adminAccessRes.status).toBe(200);
    expect(adminAccessRes.body.success).toBe(true);
    expect(Array.isArray(adminAccessRes.body.data)).toBe(true);
  });

  it('7. Non-admin users cannot access admin-only endpoints (403 Forbidden)', async () => {
    // Log in as standard seeded donor
    const donorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor@demo.org', password: 'DemoPass123!' });

    expect(donorLogin.status).toBe(200);
    const donorToken = donorLogin.body.data.token;

    const accessRes = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(accessRes.status).toBe(403);
    expect(accessRes.body.success).toBe(false);
  });

  it('8. Successfully promotes existing registered non-admin user when bootstrap runs for their email', async () => {
    // Clear the audit event to simulate initial run on existing user
    await prisma.auditEvent.deleteMany({
      where: { action: 'ADMIN_BOOTSTRAP_COMPLETED' }
    });

    // Delete existing admin user if any
    const existing = await prisma.user.findUnique({ where: { email: testAdminEmail } });
    if (existing) {
      await prisma.organizationMember.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    // Register a normal NGO user with the testAdminEmail
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pre-existing Member',
        email: testAdminEmail,
        password: 'InitialUserPass123!',
        organizationName: 'Pre-existing Community NGO',
        organizationType: 'NGO',
        address: '100 Charity Lane',
        locality: 'Uptown'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.role).toBe('NGO');
    expect(regRes.body.data.organization.approvalStatus).toBe('PENDING');

    // Execute bootstrap for this pre-existing user
    const bootstrapRes = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: testBootstrapSecret,
        email: testAdminEmail,
        password: 'UpgradedAdminPass123!'
      });

    expect(bootstrapRes.status).toBe(200);
    expect(bootstrapRes.body.data.user.role).toBe('ADMIN');
    expect(bootstrapRes.body.data.organization.approvalStatus).toBe('APPROVED');

    // Verify login with updated password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdminEmail,
        password: 'UpgradedAdminPass123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('ADMIN');
  });
});
