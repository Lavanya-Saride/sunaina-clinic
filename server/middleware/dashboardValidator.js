import { body, param, query } from 'express-validator';
import { APPOINTMENT_STATUSES, APPOINTMENT_SOURCES, PAYMENT_STATUSES } from '../models/Appointment.js';
import { CONSULTATION_TYPES, PAYMENT_METHODS } from '../config/appointmentConfig.js';
import { isValidCalendarDate } from '../utils/appointmentTime.js';
import { appointmentFieldRules, rejectUnknownFieldsFrom } from './appointmentValidator.js';

const SORT_FIELDS = ['appointmentDateTime', 'createdAt', 'patientName'];
const MAX_AMOUNT = 100000;

function optionalChoice(name, values) {
  return query(name)
    .optional({ values: 'falsy' })
    .isString()
    .withMessage(`${name} must be text.`)
    .bail()
    .isIn(values)
    .withMessage(`${name} is not valid.`);
}

function optionalDate(name) {
  return query(name)
    .optional({ values: 'falsy' })
    .isString()
    .withMessage(`${name} must be text.`)
    .bail()
    .custom((value) => {
      if (!isValidCalendarDate(value)) throw new Error(`${name} must use YYYY-MM-DD format.`);
      return true;
    });
}

export const idParamRules = [param('id').isMongoId().withMessage('Appointment not found.')];

export const loginRules = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required.')
    .bail()
    .isString()
    .withMessage('Email must be text.')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .isLength({ max: 254 }),
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required.')
    .bail()
    .isString()
    .withMessage('Password must be text.')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Password is too long.'),
];

export const listAppointmentsRules = [
  optionalChoice('status', APPOINTMENT_STATUSES),
  optionalChoice('consultationType', CONSULTATION_TYPES),
  optionalChoice('paymentStatus', PAYMENT_STATUSES),
  optionalChoice('source', APPOINTMENT_SOURCES),
  optionalChoice('sortBy', SORT_FIELDS),
  optionalChoice('sortOrder', ['asc', 'desc']),
  optionalDate('date'),
  optionalDate('dateFrom'),
  optionalDate('dateTo').custom((value, { req }) => {
    if (req.query.dateFrom && value < req.query.dateFrom) {
      throw new Error('End date cannot be before the start date.');
    }
    return true;
  }),
  query('search')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Search must be text.')
    .bail()
    .isLength({ max: 100 })
    .withMessage('Search is too long.'),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1, max: 10000 }).withMessage('Page is not valid.'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 50 }).withMessage('Limit is not valid.'),
];

const paymentFields = (prefix = '') => {
  const gated = (name) => {
    const chain = body(name);
    return prefix ? chain.if((value, { req }) => req.body.payment != null) : chain;
  };

  return [
    gated(`${prefix}method`)
      .exists({ checkFalsy: true })
      .withMessage('Payment method is required.')
      .bail()
      .isString()
      .withMessage('Payment method must be text.')
      .bail()
      .isIn(PAYMENT_METHODS)
      .withMessage('Please select a valid payment method.'),
    gated(`${prefix}amount`)
      .optional({ values: 'null' })
      .isFloat({ min: 1, max: MAX_AMOUNT })
      .withMessage('Payment amount must be a valid amount.')
      .toFloat(),
    gated(`${prefix}reference`)
      .optional({ values: 'falsy' })
      .isString()
      .withMessage('Payment reference must be text.')
      .bail()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Payment reference is too long.'),
  ];
};

export const confirmPaymentRules = [];
export const rejectUnknownPaymentFields = rejectUnknownFieldsFrom([]);

export const attendanceRules = [
  body('status')
    .exists({ checkFalsy: true })
    .withMessage('Attendance status is required.')
    .bail()
    .isString()
    .withMessage('Attendance status must be text.')
    .bail()
    .isIn(['COMPLETED', 'ABSENT'])
    .withMessage('Attendance must be completed or absent.'),
];
export const rejectUnknownAttendanceFields = rejectUnknownFieldsFrom(['status']);

export const cancelRules = [
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Reason must be text.')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason is too long.'),
];
export const rejectUnknownCancelFields = rejectUnknownFieldsFrom(['reason']);

export const createOfflineAppointmentRules = [
  ...appointmentFieldRules({ allowPastSlotToday: true, emailRequired: false }),
  body('payment')
    .optional({ values: 'null' })
    .isObject()
    .withMessage('Payment details are not valid.'),
  ...paymentFields('payment.'),
];
export const rejectUnknownOfflineFields = rejectUnknownFieldsFrom([
  'appointmentDate',
  'timeSlot',
  'consultationType',
  'fullName',
  'phoneNumber',
  'email',
  'whatsappOptIn',
  'payment',
]);

export const patientSearchRules = [
  query('search')
    .exists({ checkFalsy: true })
    .withMessage('Search is required.')
    .bail()
    .isString()
    .withMessage('Search must be text.')
    .bail()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Enter at least 3 characters.'),
];
