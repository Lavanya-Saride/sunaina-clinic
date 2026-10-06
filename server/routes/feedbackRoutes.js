import { Router } from 'express';
import { getFeedback, createFeedback } from '../controllers/feedbackController.js';
import {
  feedbackValidationRules,
  handleValidationErrors,
  rejectUnknownFields,
} from '../middleware/feedbackValidator.js';
import { noCache } from '../middleware/cacheControl.js';
import { publicReadLimiter, submitFeedbackLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/', publicReadLimiter, noCache, getFeedback);

router.post(
  '/',
  submitFeedbackLimiter,
  rejectUnknownFields,
  feedbackValidationRules,
  handleValidationErrors,
  createFeedback
);

export default router;
