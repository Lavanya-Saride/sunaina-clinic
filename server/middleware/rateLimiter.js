import rateLimit from 'express-rate-limit';

const POLLED_READ_PATHS = ['/feedback', '/appointment/booked-slots'];

export function isPolledRead(req) {
  return req.method === 'GET' && POLLED_READ_PATHS.includes(req.path);
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/dashboard') || req.path.startsWith('/auth') || isPolledRead(req),
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

export const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

export const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many sign-in attempts. Please try again later.',
  },
});

export const submitFeedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many feedback submissions from this device. Please try again later.',
  },
});

export const submitAppointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many appointment requests from this device. Please try again later.',
  },
});

export const submitCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many callback requests from this device. Please try again later.',
  },
});
