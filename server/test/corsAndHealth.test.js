import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Pin CLIENT_URL before server.js's `import 'dotenv/config'` runs, so this
// test's CORS expectations don't depend on whatever is in the local .env.
// dotenv does not overwrite variables that are already set, so this value
// wins.
process.env.CLIENT_URL =
  'http://localhost:5173,https://sunaina-clinic.vercel.app';
process.env.NODE_ENV = 'test';

let app;

before(async () => {
  ({ default: app } = await import('../server.js'));
});

describe('GET /api/health', () => {
  test('responds 200 with a database status field, and never with a stack trace', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(['connected', 'disconnected'].includes(res.body.database));
    assert.equal(res.text.includes('at '), false); // no stack trace leakage
  });
});

describe('CORS (required production allow-list)', () => {
  const allowed = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://sunaina-clinic.vercel.app',
  ];

  for (const origin of allowed) {
    test(`allows configured origin: ${origin}`, async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', origin);

      assert.equal(res.status, 200);
      assert.equal(res.headers['access-control-allow-origin'], origin);
    });
  }

  test('allows any *.vercel.app preview deployment origin over https', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://sunaina-clinic-git-preview-123.vercel.app');

    assert.equal(res.status, 200);
    assert.equal(
      res.headers['access-control-allow-origin'],
      'https://sunaina-clinic-git-preview-123.vercel.app'
    );
  });

  test('rejects a random unlisted origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil-example.com');

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('rejects an http (non-https) vercel.app origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://sunaina-clinic-git-preview-123.vercel.app');

    assert.equal(res.status, 403);
  });

  test('requests with no Origin header (e.g. curl, server-to-server) are allowed through', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
  });
});

describe('unknown route', () => {
  test('404s with a generic JSON message, no stack trace', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
