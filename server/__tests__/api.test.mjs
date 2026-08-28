// Lightweight integration test for the security/validation middleware chain.
// Uses an in-memory fake in place of the real MongoDB-backed model so it can
// run in any environment without a live database.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { feedbackValidationRules, handleValidationErrors, rejectUnknownFields } from '../middleware/feedbackValidator.js';
import { errorHandler, notFound } from '../middleware/errorHandler.js';
import { sanitizePlainText } from '../utils/sanitize.js';

// In-memory fake "database"
let store = [];
function fakeFind() {
  return [...store].sort((a, b) => b.createdAt - a.createdAt);
}
function fakeCreate({ name, service, story }) {
  const doc = { _id: String(store.length + 1), name, service, story, createdAt: new Date(), updatedAt: new Date() };
  store.push(doc);
  return doc;
}

function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/feedback', (req, res) => {
    res.status(200).json({ success: true, data: fakeFind() });
  });

  app.post(
    '/api/feedback',
    rejectUnknownFields,
    feedbackValidationRules,
    handleValidationErrors,
    (req, res) => {
      const name = sanitizePlainText(req.body.name);
      const service = sanitizePlainText(req.body.service);
      const story = sanitizePlainText(req.body.story);
      const doc = fakeCreate({ name, service, story });
      res.status(201).json({ success: true, data: doc });
    }
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function request(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const { port } = server.address();
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await res.json().catch(() => null);
        resolve({ status: res.status, body: json });
      } catch (e) {
        reject(e);
      } finally {
        server.close();
      }
    });
  });
}

test('GET /api/feedback returns empty array when db is empty', async () => {
  store = [];
  const app = buildApp();
  const res = await request(app, 'GET', '/api/feedback');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, []);
});

test('POST /api/feedback rejects missing fields', async () => {
  const app = buildApp();
  const res = await request(app, 'POST', '/api/feedback', { name: 'Jane' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('POST /api/feedback rejects invalid service value', async () => {
  const app = buildApp();
  const res = await request(app, 'POST', '/api/feedback', {
    name: 'Jane Doe',
    service: 'Not A Real Service',
    story: 'This clinic was wonderful and caring throughout my visit.',
  });
  assert.equal(res.status, 400);
});

test('POST /api/feedback rejects unexpected fields', async () => {
  const app = buildApp();
  const res = await request(app, 'POST', '/api/feedback', {
    name: 'Jane Doe',
    service: 'Wellness',
    story: 'This clinic was wonderful and caring throughout my visit.',
    isAdmin: true,
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /Unexpected field/);
});

test('POST /api/feedback strips HTML tags from input', async () => {
  store = [];
  const app = buildApp();
  const res = await request(app, 'POST', '/api/feedback', {
    name: '<b>Jane</b>',
    service: 'Gynecology',
    story: '<script>alert(1)</script>Excellent care and very attentive staff throughout.',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.name, 'Jane');
  assert.doesNotMatch(res.body.data.story, /<script>/);
});

test('POST /api/feedback rejects story below minimum length', async () => {
  const app = buildApp();
  const res = await request(app, 'POST', '/api/feedback', {
    name: 'Jane Doe',
    service: 'Wellness',
    story: 'short',
  });
  assert.equal(res.status, 400);
});

test('POST /api/feedback accepts valid submission end-to-end', async () => {
  store = [];
  const app = buildApp();
  const postRes = await request(app, 'POST', '/api/feedback', {
    name: 'Priya Sharma',
    service: 'Maternity Care',
    story: 'The team at Sunaina Clinic supported me through my whole pregnancy journey.',
  });
  assert.equal(postRes.status, 201);

  const getRes = await request(app, 'GET', '/api/feedback');
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.data.length, 1);
  assert.equal(getRes.body.data[0].name, 'Priya Sharma');
});

test('Unknown route returns 404 JSON, not a stack trace', async () => {
  const app = buildApp();
  const res = await request(app, 'GET', '/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});
