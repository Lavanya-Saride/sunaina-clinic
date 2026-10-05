import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../middleware/errorHandler.js';

function makeRes() {
  return {
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
}

describe('errorHandler', () => {
  afterEach(() => mock.restoreAll());

  test('does not log patient values contained in database error messages', () => {
    const logged = [];
    mock.method(console, 'error', (...args) => logged.push(JSON.stringify(args)));

    const error = new Error('E11000 duplicate key error dup key: { whatsappNumber: "919876543210" }');
    error.name = 'MongoServerError';
    error.code = 11000;

    const res = makeRes();
    errorHandler(error, { method: 'POST', path: '/api/appointment' }, res, () => {});

    assert.equal(logged.join('').includes('919876543210'), false);
    assert.equal(res.statusCode, 500);
    assert.equal(JSON.stringify(res.body).includes('919876543210'), false);
  });

  test('does not log validation messages that echo submitted values', () => {
    const logged = [];
    mock.method(console, 'error', (...args) => logged.push(JSON.stringify(args)));

    const error = new Error('Path `name` (`Asha Verma`, length 1) is shorter than the minimum');
    error.name = 'ValidationError';

    const res = makeRes();
    errorHandler(error, { method: 'POST', path: '/api/x' }, res, () => {});

    assert.equal(logged.join('').includes('Asha Verma'), false);
    assert.equal(res.statusCode, 400);
  });

  test('keeps the message for ordinary application errors', () => {
    const logged = [];
    mock.method(console, 'error', (...args) => logged.push(JSON.stringify(args)));

    errorHandler(Object.assign(new Error('Calendar unavailable'), { status: 502 }), { method: 'GET', path: '/x' }, makeRes(), () => {});

    assert.ok(logged.join('').includes('Calendar unavailable'));
  });
});
