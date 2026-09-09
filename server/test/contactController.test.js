import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// No real MongoDB or Resend calls happen in this suite — both the model and
// the email service are mocked at the module level.

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('contactController.requestCallback', () => {
  afterEach(() => {
    mock.reset();
  });

  test('saves the callback to MongoDB AND sends the email on the happy path (201)', async () => {
    const created = {
      _id: 'cb_1',
      name: 'Asha Verma',
      phone: '9876543210',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    mock.module('../models/CallbackRequest.js', {
      defaultExport: { create: async () => created },
    });

    const emailCalls = [];
    mock.module('../services/emailService.js', {
      namedExports: {
        sendCallbackRequest: async (args) => {
          emailCalls.push(args);
          return { id: 'email_1' };
        },
      },
    });

    const { requestCallback } = await import(
      `../controllers/contactController.js?t=${Date.now()}-1`
    );

    const req = { body: { name: 'Asha Verma', phone: '9876543210' } };
    const res = makeRes();
    const next = () => assert.fail('next() should not be called on success');

    await requestCallback(req, res, next);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'cb_1');

    // The email is requested with an idempotency key derived from the saved
    // callback's own id, so retries never double-send for the same request.
    assert.equal(emailCalls.length, 1);
    assert.equal(emailCalls[0].idempotencyKey, 'callback-cb_1');
    assert.equal(emailCalls[0].name, 'Asha Verma');
  });

  test('still saves to MongoDB and returns the saved id even when the email send fails (503, not a false success)', async () => {
    const created = {
      _id: 'cb_2',
      name: 'Rita Kumari',
      phone: '9123456780',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    mock.module('../models/CallbackRequest.js', {
      defaultExport: { create: async () => created },
    });

    mock.module('../services/emailService.js', {
      namedExports: {
        sendCallbackRequest: async () => {
          throw new Error('The gmail.com domain is not verified.');
        },
      },
    });

    const { requestCallback } = await import(
      `../controllers/contactController.js?t=${Date.now()}-2`
    );

    const req = { body: { name: 'Rita Kumari', phone: '9123456780' } };
    const res = makeRes();
    const next = () => assert.fail('next() should not be called here');

    await requestCallback(req, res, next);

    // Critical requirement: DB save must succeed and be reported, even
    // though the email failed — the request is never lost, and success is
    // never falsely reported.
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.data.id, 'cb_2');
  });

  test('forwards unexpected DB errors to next() instead of crashing or masking them', async () => {
    mock.module('../models/CallbackRequest.js', {
      defaultExport: {
        create: async () => {
          throw new Error('Mongo connection lost');
        },
      },
    });

    mock.module('../services/emailService.js', {
      namedExports: {
        sendCallbackRequest: async () => {
          assert.fail('email should never be attempted if the DB save failed');
        },
      },
    });

    const { requestCallback } = await import(
      `../controllers/contactController.js?t=${Date.now()}-3`
    );

    const req = { body: { name: 'A', phone: '9876543210' } };
    const res = makeRes();

    let forwardedError = null;
    const next = (err) => {
      forwardedError = err;
    };

    await requestCallback(req, res, next);

    assert.ok(forwardedError instanceof Error);
    assert.match(forwardedError.message, /Mongo connection lost/);
    assert.equal(res.statusCode, null, 'res.status should not have been called');
  });
});
