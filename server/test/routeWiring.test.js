import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import feedbackRouter from '../routes/feedbackRoutes.js';
import appointmentRouter from '../routes/appointmentRoutes.js';
import contactRouter from '../routes/contactRoutes.js';

import {
  submitFeedbackLimiter,
  submitAppointmentLimiter,
  submitCallbackLimiter,
} from '../middleware/rateLimiter.js';

// Walks an Express router's internal stack and returns the middleware
// functions registered for a given method+path, so we can assert the
// *actual* limiter instance (by reference) is present — proving it's wired
// into the route, not merely imported/exported unused.
function middlewareFor(router, method, path) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  );

  assert.ok(layer, `No ${method.toUpperCase()} ${path} route found`);

  return layer.route.stack.map((s) => s.handle);
}

describe('rate limiters are wired into routes (not just exported)', () => {
  test('POST /api/feedback uses submitFeedbackLimiter', () => {
    const handlers = middlewareFor(feedbackRouter, 'post', '/');
    assert.ok(handlers.includes(submitFeedbackLimiter));
  });

  test('POST /api/appointment uses submitAppointmentLimiter', () => {
    const handlers = middlewareFor(appointmentRouter, 'post', '/');
    assert.ok(handlers.includes(submitAppointmentLimiter));
  });

  test('POST /api/contact/callback uses submitCallbackLimiter', () => {
    const handlers = middlewareFor(contactRouter, 'post', '/callback');
    assert.ok(handlers.includes(submitCallbackLimiter));
  });

  test('rate limiter runs before validation/DB middleware on feedback route', () => {
    const handlers = middlewareFor(feedbackRouter, 'post', '/');
    const limiterIndex = handlers.indexOf(submitFeedbackLimiter);
    assert.equal(
      limiterIndex,
      0,
      'Rate limiter should be the first middleware so requests are throttled before any DB/validation work runs'
    );
  });

  test('rate limiter runs before validation/DB middleware on appointment route', () => {
    const handlers = middlewareFor(appointmentRouter, 'post', '/');
    const limiterIndex = handlers.indexOf(submitAppointmentLimiter);
    assert.equal(limiterIndex, 0);
  });

  test('rate limiter runs before validation/DB middleware on callback route', () => {
    const handlers = middlewareFor(contactRouter, 'post', '/callback');
    const limiterIndex = handlers.indexOf(submitCallbackLimiter);
    assert.equal(limiterIndex, 0);
  });
});
