import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { openapiSpec } from '../src/docs/openapi.js';

describe('MealRelay OpenAPI 3.0 Documentation & Swagger UI', () => {
  it('GET /api/docs/openapi.json returns valid OpenAPI 3.0.3 specification', async () => {
    const res = await request(app).get('/api/docs/openapi.json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('MealRelay API');
    expect(res.body.info.version).toBeDefined();
  });

  it('contains comprehensive documentation for all core routes and workflows', async () => {
    const expectedRoutes = [
      '/health',
      '/auth/register',
      '/auth/login',
      '/auth/me',
      '/donations',
      '/donations/{id}',
      '/donations/{id}/claim',
      '/donations/{id}/pickup-code',
      '/donations/{id}/verify-pickup',
      '/donations/{id}/cancel',
      '/donations/{id}/history',
      '/organizations',
      '/organizations/{id}',
      '/organizations/{id}/approval',
      '/dashboard/summary',
      '/admin/bootstrap'
    ];

    for (const route of expectedRoutes) {
      expect(
        openapiSpec.paths[route],
        `Expected route ${route} to be documented in OpenAPI specification`
      ).toBeDefined();
    }
  });

  it('documents bearerAuth security scheme for protected routes', async () => {
    expect(openapiSpec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(openapiSpec.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(openapiSpec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(openapiSpec.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT');
  });

  it('GET /api/docs returns Swagger UI HTML interface', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });

  it('does not expose internal environment secrets or hardcoded passwords in spec', async () => {
    const specString = JSON.stringify(openapiSpec);
    expect(specString).not.toContain(process.env.ADMIN_BOOTSTRAP_SECRET || 'undefined');
    expect(specString).not.toContain(process.env.JWT_SECRET || 'undefined');
    expect(specString).not.toContain(process.env.DATABASE_URL || 'undefined');
  });
});
