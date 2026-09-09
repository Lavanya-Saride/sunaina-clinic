import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// This suite NEVER makes a real network call to Resend. The 'resend'
// package is fully mocked via node:test's module mocking, per the project
// requirement that automated tests must not hit real external services.

const ORIGINAL_ENV = { ...process.env };

function setEmailEnv(overrides = {}) {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.RESEND_FROM = 'onboarding@resend.dev';
  process.env.CLINIC_EMAIL = 'clinic@example.com';
  Object.assign(process.env, overrides);
}

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe('emailService.sendCallbackRequest (Resend mocked, no real network call)', () => {
  afterEach(() => {
    restoreEnv();
    mock.reset();
  });

  test('sends via Resend with correct from/to/subject and passes the idempotency key through as an option (not in the payload)', async () => {
    setEmailEnv();

    const sendCalls = [];

    mock.module('resend', {
      namedExports: {
        Resend: class {
          constructor(apiKey) {
            this.apiKey = apiKey;
          }
          emails = {
            send: async (payload, options) => {
              sendCalls.push({ payload, options, apiKey: this.apiKey });
              return { data: { id: 'email_123' }, error: null };
            },
          };
        },
      },
    });

    const { sendCallbackRequest } = await import(
      `../services/emailService.js?t=${Date.now()}-1`
    );

    const result = await sendCallbackRequest({
      name: 'Asha Verma',
      phone: '+919876543210',
      idempotencyKey: 'callback-abc123',
    });

    assert.equal(sendCalls.length, 1);
    assert.equal(sendCalls[0].apiKey, 're_test_key');
    assert.equal(sendCalls[0].payload.from, 'onboarding@resend.dev');
    assert.deepEqual(sendCalls[0].payload.to, ['clinic@example.com']);
    assert.match(sendCalls[0].payload.subject, /Callback Request/);
    assert.match(sendCalls[0].payload.text, /Asha Verma/);
    assert.match(sendCalls[0].payload.text, /\+919876543210/);
    assert.deepEqual(sendCalls[0].options, {
      idempotencyKey: 'callback-abc123',
    });
    assert.equal(result.id, 'email_123');
  });

  test('throws and does not report success when Resend returns an error (never silently succeeds)', async () => {
    setEmailEnv();

    mock.module('resend', {
      namedExports: {
        Resend: class {
          emails = {
            send: async () => ({
              data: null,
              error: { message: 'Domain not verified', statusCode: 403 },
            }),
          };
        },
      },
    });

    const { sendCallbackRequest } = await import(
      `../services/emailService.js?t=${Date.now()}-2`
    );

    await assert.rejects(
      () => sendCallbackRequest({ name: 'A', phone: '9876543210' }),
      /Domain not verified/
    );
  });

  test('throws when RESEND_API_KEY is missing (never sends with an empty key)', async () => {
    setEmailEnv({ RESEND_API_KEY: '' });

    mock.module('resend', {
      namedExports: {
        Resend: class {
          emails = { send: async () => ({ data: { id: 'x' }, error: null }) };
        },
      },
    });

    const { sendCallbackRequest } = await import(
      `../services/emailService.js?t=${Date.now()}-3`
    );

    await assert.rejects(
      () => sendCallbackRequest({ name: 'A', phone: '9876543210' }),
      /RESEND_API_KEY is not configured/
    );
  });

  test('throws when RESEND_FROM is missing', async () => {
    setEmailEnv({ RESEND_FROM: '' });

    mock.module('resend', {
      namedExports: {
        Resend: class {
          emails = { send: async () => ({ data: { id: 'x' }, error: null }) };
        },
      },
    });

    const { sendCallbackRequest } = await import(
      `../services/emailService.js?t=${Date.now()}-4`
    );

    await assert.rejects(
      () => sendCallbackRequest({ name: 'A', phone: '9876543210' }),
      /RESEND_FROM is not configured/
    );
  });

  test('throws when CLINIC_EMAIL is missing', async () => {
    setEmailEnv({ CLINIC_EMAIL: '' });

    mock.module('resend', {
      namedExports: {
        Resend: class {
          emails = { send: async () => ({ data: { id: 'x' }, error: null }) };
        },
      },
    });

    const { sendCallbackRequest } = await import(
      `../services/emailService.js?t=${Date.now()}-5`
    );

    await assert.rejects(
      () => sendCallbackRequest({ name: 'A', phone: '9876543210' }),
      /CLINIC_EMAIL is not configured/
    );
  });

  test('does not pass an idempotencyKey option when none is given (backwards compatible)', async () => {
    setEmailEnv();

    let capturedOptions = 'not-called';

    mock.module('resend', {
      namedExports: {
        Resend: class {
          emails = {
            send: async (payload, options) => {
              capturedOptions = options;
              return { data: { id: 'email_456' }, error: null };
            },
          };
        },
      },
    });

    const { sendCallbackRequest } = await import(
      `../services/emailService.js?t=${Date.now()}-6`
    );

    await sendCallbackRequest({ name: 'A', phone: '9876543210' });

    assert.equal(capturedOptions, undefined);
  });
});
