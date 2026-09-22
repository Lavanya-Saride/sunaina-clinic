import { Router } from 'express';
import { paymentWebhook, verifyPayment } from '../controllers/paymentController.js';
import { submitAppointmentLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/verify', submitAppointmentLimiter, verifyPayment);
router.post('/webhook', paymentWebhook);

export default router;
