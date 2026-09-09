import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

import {
  apiLimiter,
  submitFeedbackLimiter,
  submitAppointmentLimiter,
  submitCallbackLimiter,
} from '../middleware/rateLimiter.js';

// Each limiter is mounted on its own tiny throwaway app so requests in one
// test can't bleed into another test's rate-limit window/counter.
function appWithLimiter(limiter) {
  const app = express();
  app.get('/x', limiter, (req, res) => res.status(200).json({ ok: true }));
  return app;
}

async function fireRequests(app, count) {
  const responses = [];
  for (let i = 0; i < count; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    responses.push(await request(app).get('/x'));
  }
  return responses;
}

describe('rate limiters (real exported middleware, not re-implemented)', () => {
  test('apiLimiter: allows 200 requests per 15 min window and reports limit=200', async () => {
    const app = appWithLimiter(apiLimiter);
    const first = await request(app).get('/x');
    assert.equal(first.status, 200);
    assert.equal(first.headers['ratelimit-limit'], '200');
  });

  test('submitFeedbackLimiter: limit is 5, 6th request in the window is rejected with 429', async () => {
    const app = appWithLimiter(submitFeedbackLimiter);
    const responses = await fireRequests(app, 6);
    const statuses = responses.map((r) => r.status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
    assert.equal(responses[0].headers['ratelimit-limit'], '5');
    assert.equal(responses[5].body.success, false);
  });

  test('submitAppointmentLimiter: limit is 10, 11th request in the window is rejected with 429', async () => {
    const app = appWithLimiter(submitAppointmentLimiter);
    const responses = await fireRequests(app, 11);
    assert.equal(responses[9].status, 200);
    assert.equal(responses[10].status, 429);
    assert.equal(responses[0].headers['ratelimit-limit'], '10');
  });

  test('submitCallbackLimiter: limit is 5, 6th request in the window is rejected with 429', async () => {
    const app = appWithLimiter(submitCallbackLimiter);
    const responses = await fireRequests(app, 6);
    assert.equal(responses[4].status, 200);
    assert.equal(responses[5].status, 429);
    assert.equal(responses[0].headers['ratelimit-limit'], '5');
  });
});
