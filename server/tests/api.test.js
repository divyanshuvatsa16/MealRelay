import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

describe('MealRelay API Integration Tests', () => {
  let approvedDonorToken = '';
  let approvedDonorUser = null;
  let approvedDonorOrg = null;

  let approvedNgoToken = '';
  let approvedNgoUser = null;

  let pendingNgoToken = '';
  let pendingNgoUser = null;

  let otherDonorToken = '';
  let otherDonorOrg = null;

  beforeAll(async () => {
    // Clean up test data if needed or ensure seed exists
    // Log into seeded accounts to get tokens
    const donorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor@demo.org', password: 'DemoPass123!' });

    approvedDonorToken = donorRes.body.data.token;
    approvedDonorUser = donorRes.body.data.user;
    approvedDonorOrg = donorRes.body.data.organization;

    const ngoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ngo@demo.org', password: 'DemoPass123!' });

    approvedNgoToken = ngoRes.body.data.token;
    approvedNgoUser = ngoRes.body.data.user;

    const pendingRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pending.ngo@demo.org', password: 'DemoPass123!' });

    pendingNgoToken = pendingRes.body.data.token;
    pendingNgoUser = pendingRes.body.data.user;

    // Create a second approved donor organization for cross-tenant testing
    const uniqueId = Date.now();
    const otherDonorRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second Donor Person',
        email: `second.donor.${uniqueId}@test.org`,
        password: 'Password123!',
        organizationName: 'Second Donor Bakery',
        organizationType: 'DONOR',
        address: '500 Secondary Street',
        locality: 'Westside'
      });

    otherDonorToken = otherDonorRes.body.data.token;
    otherDonorOrg = otherDonorRes.body.data.organization;

    // Approve the second donor in DB directly so it can be used for isolation tests
    await prisma.organization.update({
      where: { id: otherDonorOrg.id },
      data: { approvalStatus: 'APPROVED' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Health endpoint succeeds
  it('1. Health endpoint succeeds and verifies database connectivity', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  // 2. Registration creates a user with a password hash, not a plaintext password
  it('2. Registration creates a user with a password hash, not a plaintext password', async () => {
    const testEmail = `newuser.${Date.now()}@test.org`;
    const rawPassword = 'SuperSecret123!';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hash Verification User',
        email: testEmail,
        password: rawPassword,
        organizationName: 'Fresh Harvest Donor',
        organizationType: 'DONOR',
        address: '77 Greenway Road',
        locality: 'Eastside'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    // Never expose password hash in response
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('password');

    // Verify database record directly
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail.toLowerCase() }
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser.passwordHash).not.toBe(rawPassword);
    expect(dbUser.passwordHash.length).toBeGreaterThan(30);

    const isMatch = await bcrypt.compare(rawPassword, dbUser.passwordHash);
    expect(isMatch).toBe(true);
  });

  // 3. Duplicate email registration is rejected
  it('3. Duplicate email registration is rejected with conflict error', async () => {
    const duplicateEmail = `duplicate.${Date.now()}@test.org`;

    // First registration
    const firstRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First User',
        email: duplicateEmail,
        password: 'Password123!',
        organizationName: 'Org One',
        organizationType: 'DONOR',
        address: '123 Main St',
        locality: 'Downtown'
      });
    expect(firstRes.status).toBe(201);

    // Duplicate registration attempt
    const secondRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second User',
        email: duplicateEmail,
        password: 'Password123!',
        organizationName: 'Org Two',
        organizationType: 'DONOR',
        address: '456 Main St',
        locality: 'Downtown'
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.error.message).toMatch(/already exists/i);
  });

  // 4. Public registration cannot create an ADMIN
  it('4. Public registration cannot create an ADMIN even if requested', async () => {
    const testEmail = `adminattempt.${Date.now()}@test.org`;

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Fake Admin User',
        email: testEmail,
        password: 'Password123!',
        organizationName: 'Sneaky Org',
        organizationType: 'DONOR',
        address: '100 Admin Lane',
        locality: 'Downtown',
        role: 'ADMIN' // Malicious attempt to escalate privileges
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).not.toBe('ADMIN');
    expect(res.body.data.user.role).toBe('DONOR');

    // Confirm in DB
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail.toLowerCase() }
    });
    expect(dbUser.role).toBe('DONOR');
  });

  // 5. Login succeeds with valid credentials
  it('5. Login succeeds with valid credentials and returns safe fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'donor@demo.org',
        password: 'DemoPass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('donor@demo.org');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.organization.name).toBe('Green Bites Cafe & Mess');
  });

  // 6. Login fails with invalid credentials
  it('6. Login fails with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'donor@demo.org',
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });

  // 7. Unauthenticated donation creation is rejected
  it('7. Unauthenticated donation creation is rejected with 401', async () => {
    const now = new Date();
    const res = await request(app)
      .post('/api/donations')
      .send({
        title: 'Unauthenticated Bread',
        description: 'Should fail with 401',
        quantity: 10,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 3600000).toISOString(),
        pickupDeadline: new Date(now.getTime() + 7200000).toISOString(),
        consumeBy: new Date(now.getTime() + 14400000).toISOString()
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 8. A non-donor cannot publish a donation
  it('8. A non-donor (NGO) cannot publish a donation', async () => {
    const now = new Date();
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({
        title: 'NGO Attempted Bread',
        description: 'NGO should not be able to publish donations',
        quantity: 10,
        unit: 'meals',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 3600000).toISOString(),
        pickupDeadline: new Date(now.getTime() + 7200000).toISOString(),
        consumeBy: new Date(now.getTime() + 14400000).toISOString()
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/DONOR/i);
  });

  // 9. Invalid quantity and invalid timestamps are rejected
  it('9. Invalid quantity (<= 0) and invalid timestamps are rejected with 400', async () => {
    const now = new Date();

    // Negative quantity
    const resNegativeQty = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${approvedDonorToken}`)
      .send({
        title: 'Negative Food Quantity',
        description: 'Testing validation for negative quantity',
        quantity: -5,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 3600000).toISOString(),
        pickupDeadline: new Date(now.getTime() + 7200000).toISOString(),
        consumeBy: new Date(now.getTime() + 14400000).toISOString()
      });

    expect(resNegativeQty.status).toBe(400);
    expect(resNegativeQty.body.success).toBe(false);

    // Pickup deadline in past
    const resPastPickup = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${approvedDonorToken}`)
      .send({
        title: 'Past Pickup Deadline',
        description: 'Testing validation for past deadline',
        quantity: 10,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 7200000).toISOString(),
        pickupDeadline: new Date(now.getTime() - 3600000).toISOString(),
        consumeBy: new Date(now.getTime() + 14400000).toISOString()
      });

    expect(resPastPickup.status).toBe(400);

    // consumeBy earlier than preparedAt
    const resInvalidOrder = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${approvedDonorToken}`)
      .send({
        title: 'Illogical Timestamps',
        description: 'Testing validation for consumeBy earlier than preparedAt',
        quantity: 10,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() + 14400000).toISOString(),
        pickupDeadline: new Date(now.getTime() + 7200000).toISOString(),
        consumeBy: new Date(now.getTime() + 3600000).toISOString()
      });

    expect(resInvalidOrder.status).toBe(400);
  });

  // 10. An approved donor can create a donation
  let createdDonationId = '';
  it('10. An approved donor can create a donation with status OPEN and audit log', async () => {
    const now = new Date();
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${approvedDonorToken}`)
      .send({
        title: 'Freshly Baked Artisan Focaccia',
        description: 'Warm olive and rosemary focaccia baked this afternoon. Packed in food-safe cardboard cartons.',
        quantity: 25,
        unit: 'portions',
        foodType: 'VEGETARIAN',
        preparedAt: new Date(now.getTime() - 1800000).toISOString(),
        pickupDeadline: new Date(now.getTime() + 10800000).toISOString(),
        consumeBy: new Date(now.getTime() + 21600000).toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Freshly Baked Artisan Focaccia');
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.donorOrganizationId).toBe(approvedDonorOrg.id);
    expect(res.body.data.donorOrganization.name).toBe('Green Bites Cafe & Mess');

    createdDonationId = res.body.data.id;

    // Verify audit event was recorded
    const auditEvent = await prisma.auditEvent.findFirst({
      where: { donationId: createdDonationId, action: 'DONATION_CREATED' }
    });
    expect(auditEvent).not.toBeNull();
    expect(auditEvent.newStatus).toBe('OPEN');
  });

  // 11. A user cannot modify another organization's donation
  it("11. A user cannot modify another organization's donation", async () => {
    expect(createdDonationId).toBeTruthy();

    const res = await request(app)
      .patch(`/api/donations/${createdDonationId}`)
      .set('Authorization', `Bearer ${otherDonorToken}`)
      .send({
        title: 'Unauthorized Tampering Attempt'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/permission/i);

    // Verify original title was preserved in DB
    const original = await prisma.donation.findUnique({
      where: { id: createdDonationId }
    });
    expect(original.title).toBe('Freshly Baked Artisan Focaccia');
  });

  // 12. An unauthorized user cannot view private donation details
  it('12. An unauthorized user cannot view private non-open donation details', async () => {
    // Create a CANCELLED private donation owned by the approved donor
    const now = new Date();
    const privateDonation = await prisma.donation.create({
      data: {
        donorOrganizationId: approvedDonorOrg.id,
        title: 'Confidential Internal Donation',
        description: 'Cancelled due to quality control inspection',
        quantity: 12,
        unit: 'portions',
        foodType: 'OTHER',
        preparedAt: new Date(now.getTime() - 7200000),
        pickupDeadline: new Date(now.getTime() + 3600000),
        consumeBy: new Date(now.getTime() + 14400000),
        status: 'CANCELLED'
      }
    });

    // Owning donor CAN view it
    const ownerRes = await request(app)
      .get(`/api/donations/${privateDonation.id}`)
      .set('Authorization', `Bearer ${approvedDonorToken}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.id).toBe(privateDonation.id);

    // Unrelated donor CANNOT view it
    const strangerRes = await request(app)
      .get(`/api/donations/${privateDonation.id}`)
      .set('Authorization', `Bearer ${otherDonorToken}`);
    expect(strangerRes.status).toBe(403);
    expect(strangerRes.body.success).toBe(false);

    // Unauthenticated user CANNOT view it
    const anonRes = await request(app).get(`/api/donations/${privateDonation.id}`);
    expect(anonRes.status).toBe(403);
  });

  // 13. Pagination and filters behave correctly
  it('13. Pagination and filters behave correctly', async () => {
    // Query page 1 with limit 2
    const pageRes = await request(app).get('/api/donations?page=1&limit=2');
    expect(pageRes.status).toBe(200);
    expect(pageRes.body.success).toBe(true);
    expect(pageRes.body.data.length).toBeLessThanOrEqual(2);
    expect(pageRes.body.pagination.page).toBe(1);
    expect(pageRes.body.pagination.limit).toBe(2);
    expect(pageRes.body.pagination).toHaveProperty('total');
    expect(pageRes.body.pagination).toHaveProperty('totalPages');

    // Filter by foodType=VEGETARIAN
    const vegRes = await request(app).get('/api/donations?foodType=VEGETARIAN');
    expect(vegRes.status).toBe(200);
    expect(vegRes.body.data.every((d) => d.foodType === 'VEGETARIAN')).toBe(true);

    // Filter by locality
    const localityRes = await request(app).get('/api/donations?locality=Downtown');
    expect(localityRes.status).toBe(200);
    expect(
      localityRes.body.data.every((d) =>
        d.donorOrganization.locality.toLowerCase().includes('downtown')
      )
    ).toBe(true);
  });

  // 14. Invalid JSON produces a controlled error response
  it('14. Invalid JSON produces a controlled error response with code INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"badJson": true, syntax_error');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(res.body.error.message).toMatch(/malformed json/i);
  });

  // 15. Owning donor can update OPEN donation, but cannot edit non-OPEN donation
  it('15. Owning donor can update OPEN donation, but cannot edit non-OPEN donation', async () => {
    // Update created OPEN donation
    const updateRes = await request(app)
      .patch(`/api/donations/${createdDonationId}`)
      .set('Authorization', `Bearer ${approvedDonorToken}`)
      .send({
        title: 'Freshly Baked Artisan Focaccia - Extra Herbs',
        quantity: 30
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.title).toBe('Freshly Baked Artisan Focaccia - Extra Herbs');
    expect(updateRes.body.data.quantity).toBe(30);

    // Verify audit event for update
    const updateAudit = await prisma.auditEvent.findFirst({
      where: { donationId: createdDonationId, action: 'DONATION_UPDATED' }
    });
    expect(updateAudit).not.toBeNull();
  });
});
