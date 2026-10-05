import { Router } from 'express';
import {
  cancelAppointmentById,
  confirmAppointmentPayment,
  createOfflineAppointment,
  getAppointments,
  retryAppointmentAutomation,
  searchPatients,
  setAttendance,
} from '../controllers/dashboardController.js';
import { authenticate, noStore, requirePermission } from '../middleware/auth.js';
import { handleAppointmentValidationErrors } from '../middleware/appointmentValidator.js';
import {
  attendanceRules,
  cancelRules,
  confirmPaymentRules,
  createOfflineAppointmentRules,
  idParamRules,
  listAppointmentsRules,
  patientSearchRules,
  rejectUnknownAttendanceFields,
  rejectUnknownCancelFields,
  rejectUnknownOfflineFields,
  rejectUnknownPaymentFields,
} from '../middleware/dashboardValidator.js';
import { dashboardLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(noStore, dashboardLimiter, authenticate);

router.get(
  '/appointments',
  requirePermission('appointments:view'),
  listAppointmentsRules,
  handleAppointmentValidationErrors,
  getAppointments
);

router.post(
  '/appointments',
  requirePermission('appointments:create'),
  rejectUnknownOfflineFields,
  createOfflineAppointmentRules,
  handleAppointmentValidationErrors,
  createOfflineAppointment
);

router.post(
  '/appointments/:id/confirm-payment',
  requirePermission('payments:confirm'),
  idParamRules,
  rejectUnknownPaymentFields,
  confirmPaymentRules,
  handleAppointmentValidationErrors,
  confirmAppointmentPayment
);

router.post(
  '/appointments/:id/attendance',
  requirePermission('attendance:mark'),
  idParamRules,
  rejectUnknownAttendanceFields,
  attendanceRules,
  handleAppointmentValidationErrors,
  setAttendance
);

router.post(
  '/appointments/:id/cancel',
  requirePermission('appointments:cancel'),
  idParamRules,
  rejectUnknownCancelFields,
  cancelRules,
  handleAppointmentValidationErrors,
  cancelAppointmentById
);

router.post(
  '/appointments/:id/retry',
  requirePermission('automation:retry'),
  idParamRules,
  handleAppointmentValidationErrors,
  retryAppointmentAutomation
);

router.get(
  '/patients',
  requirePermission('patients:view'),
  patientSearchRules,
  handleAppointmentValidationErrors,
  searchPatients
);

export default router;
