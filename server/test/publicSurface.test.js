import { test, describe, before, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';

let app;

before(async () => {
  ({ default: app } = await import('../server.js'));
});

afterEach(() => {
  mock.restoreAll();
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_PLACE_ID;
  delete process.env.GOOGLE_OAUTH_SETUP_ENABLED;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;
  process.env.NODE_ENV = 'test';
});

describe('readiness', () => {
  test('reports 503 and a no-store header while the database is not connected', async () => {
    const res = await request(app).get('/api/health/ready');
    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, 'unavailable');
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  test('liveness stays 200 so a database blip does not restart the process', async () => {
    assert.equal((await request(app).get('/api/health')).status, 200);
  });
});

describe('Google Places failures are not forwarded to the public', () => {
  test('a provider error with details yields a generic 502 body', async () => {
    process.env.GOOGLE_PLACES_API_KEY = 'AIza-test-key-not-real';
    process.env.GOOGLE_PLACE_ID = 'place-123';
    mock.method(globalThis, 'fetch', async (url, options) => {
      if (String(url).startsWith('https://places.googleapis.com/')) {
        return new Response(
          JSON.stringify({ error: { message: 'API key AIza-test-key-not-real is not authorized for project 99887766' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`unexpected network call: ${url}`);
    });
    mock.method(console, 'error', () => {});

    const res = await request(app).get('/api/google-places/reviews');
    assert.equal(res.status, 502);
    assert.deepEqual(res.body, { success: false, message: 'Unable to load Google reviews.' });
    assert.equal(JSON.stringify(res.body).includes('AIza'), false);
    assert.equal(JSON.stringify(res.body).includes('99887766'), false);
  });
});

describe('Google OAuth setup routes', () => {
  function configure() {
    process.env.GOOGLE_OAUTH_SETUP_ENABLED = 'true';
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/google/callback';
  }

  test('are available outside production only when the flag is on', async () => {
    assert.equal((await request(app).get('/api/google/authorize')).status, 404);
    configure();
    const res = await request(app).get('/api/google/authorize');
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /^https:\/\/accounts\.google\.com\//);
  });

  test('stay disabled in production even if the flag is left on', async () => {
    configure();
    process.env.NODE_ENV = 'production';
    assert.equal((await request(app).get('/api/google/authorize')).status, 404);
    assert.equal((await request(app).get('/api/google/callback?code=x&state=y')).status, 404);
  });
});
