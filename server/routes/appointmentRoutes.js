import { Router } from 'express';
import { createAppointmentOrder, getBookedSlots } from '../controllers/appointmentController.js';
import {
  appointmentValidationRules,
  bookedSlotsQueryRules,
  handleAppointmentValidationErrors,
  rejectUnknownAppointmentFields,
} from '../middleware/appointmentValidator.js';
import { submitAppointmentLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/booked-slots', bookedSlotsQueryRules, handleAppointmentValidationErrors, getBookedSlots);
router.post('/', submitAppointmentLimiter, rejectUnknownAppointmentFields, appointmentValidationRules, handleAppointmentValidationErrors, createAppointmentOrder);

export default router;
