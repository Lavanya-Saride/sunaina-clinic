import express from 'express';
import {
  requestCallback,
} from '../controllers/contactController.js';

import {
  contactValidationRules,
  handleContactValidationErrors,
} from '../middleware/contactValidator.js';

const router = express.Router();

router.post(
  '/callback',
  contactValidationRules,
  handleContactValidationErrors,
  requestCallback
);

export default router;