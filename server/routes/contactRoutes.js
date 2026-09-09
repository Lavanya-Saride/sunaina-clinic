import express from 'express';
import {
  requestCallback,
} from '../controllers/contactController.js';

import {
  contactValidationRules,
  handleContactValidationErrors,
} from '../middleware/contactValidator.js';
import { submitCallbackLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post(
  '/callback',
  submitCallbackLimiter,
  contactValidationRules,
  handleContactValidationErrors,
  requestCallback
);

export default router;