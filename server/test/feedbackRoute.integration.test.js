import { test, describe, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

let app;

before(async () => {
  mock.module('../models/Feedback.js', {
    defaultExport: {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({
              lean: async () => [
                { name: 'Asha', story: 'Wonderful care', createdAt: new Date() },
              ],
            }),
          }),
        }),
      }),
      create: async (doc) => ({ _id: 'fb_1', ...doc, createdAt: new Date() }),
    },
  });

  const { default: feedbackRoutes } = await import(
    `../routes/feedbackRoutes.js?t=${Date.now()}`
  );

  app = express();
  app.use(express.json());
  app.use('/api/feedback', feedbackRoutes);
});

describe('GET /api/feedback', () => {
  test('returns 200 with the feedback list', async () => {
    const res = await request(app).get('/api/feedback');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
  });
});

describe('POST /api/feedback validation', () => {
  test('valid payload succeeds with 201', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ name: 'Asha Verma', story: 'The doctor was thorough and kind.' });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  test('missing name is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ story: 'The doctor was thorough and kind.' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'name'));
  });

  test('story below the 10 character minimum is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ name: 'Asha Verma', story: 'too short' });

    assert.equal(res.status, 400);
    assert.ok(res.body.errors.some((e) => e.field === 'story'));
  });

  test('unknown fields are rejected with 400 before hitting validation/DB', async () => {
    const res = await request(app).post('/api/feedback').send({
      name: 'Asha Verma',
      story: 'The doctor was thorough and kind.',
      isAdmin: true,
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /isAdmin/);
  });
});
