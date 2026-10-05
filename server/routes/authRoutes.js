import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { authenticate, noStore } from '../middleware/auth.js';
import { loginRules } from '../middleware/dashboardValidator.js';
import { handleAppointmentValidationErrors } from '../middleware/appointmentValidator.js';
import { dashboardLimiter, loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(noStore, dashboardLimiter);

router.post('/login', loginLimiter, loginRules, handleAppointmentValidationErrors, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export default router;
