import '../src/config/env.js';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import prisma from '../src/config/prisma.js';

const base = process.env.SMOKE_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api`;
const email = `neon-smoke-${randomUUID()}@example.com`;
const password = randomBytes(24).toString('hex');
let organizationId;

async function request(endpoint, { expected = 200, token, body } = {}) {
  const response = await fetch(`${base}${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  assert.ok(response.headers.get('content-type')?.includes('application/json'),
    `${endpoint}: expected JSON, received HTTP ${response.status} (check API port)`);
  const result = JSON.parse(text);
  assert.equal(response.status, expected, `${endpoint}: ${result.error?.message || response.status}`);
  console.log(`PASS HTTP ${response.status} ${endpoint}`);
  return result;
}

try {
  const health = await request('/health');
  assert.equal(health.database, 'connected');
  const registration = await request('/auth/register', {
    expected: 201,
    body: {
      name: 'Neon Connection Check', email, password,
      organizationName: 'Neon Smoke Test', organizationType: 'NGO',
      address: 'Temporary integration test address', locality: 'Test'
    }
  });
  organizationId = registration.data.organization.id;
  const persisted = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.equal(persisted.id, registration.data.user.id);
  assert.notEqual(persisted.passwordHash, password);
  assert.ok(persisted.passwordHash.startsWith('$2'));
  console.log('PASS registration persisted in Neon with a bcrypt password hash');

  const login = await request('/auth/login', { body: { email, password } });
  const token = login.data.token;
  const me = await request('/auth/me', { token });
  assert.equal(me.data.user.id, persisted.id);
  await request('/dashboard/summary', { token });
  await request('/donations', { token });
  console.log('PASS Neon end-to-end: HTTP write, database read, login, authenticated queries');
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    // Delete only this run's uniquely named account and its related fixtures.
    const user = await prisma.user.findUnique({
      where: { email }, include: { memberships: true }
    });
    if (user) {
      organizationId ||= user.memberships[0]?.organizationId;
      await prisma.$transaction(async tx => {
        await tx.auditEvent.deleteMany({ where: { actorUserId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
        if (organizationId) await tx.organization.delete({ where: { id: organizationId } });
      });
      console.log('PASS temporary smoke-test records removed');
    }
  } catch (error) {
    console.error(`FAIL smoke-test cleanup: ${error.message}`);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}
