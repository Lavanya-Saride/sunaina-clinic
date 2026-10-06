import { Router } from 'express';
import { createAppointment, getBookedSlots } from '../controllers/appointmentController.js';
import {
  appointmentValidationRules,
  bookedSlotsQueryRules,
  handleAppointmentValidationErrors,
  rejectUnknownAppointmentFields,
} from '../middleware/appointmentValidator.js';
import { noStore } from '../middleware/cacheControl.js';
import { publicReadLimiter, submitAppointmentLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(noStore);

router.get('/booked-slots', publicReadLimiter, bookedSlotsQueryRules, handleAppointmentValidationErrors, getBookedSlots);
router.post('/', submitAppointmentLimiter, rejectUnknownAppointmentFields, appointmentValidationRules, handleAppointmentValidationErrors, createAppointment);

export default router;
