import { body, query, validationResult } from 'express-validator';
import { TIME_SLOTS } from '../models/Appointment.js';
import { CONSULTATION_TYPES } from '../config/appointmentConfig.js';
import {
  getNowMinutes,
  getSlotMinutes,
  getTodayString,
  isSunday,
  isValidCalendarDate,
} from '../utils/appointmentTime.js';

const PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

function isPastTodaySlot(date, slot) {
  if (date !== getTodayString()) return false;
  return getSlotMinutes(slot) <= getNowMinutes();
}

export function appointmentFieldRules({ allowPastSlotToday = false, emailRequired = true } = {}) {
  return [
    body('appointmentDate')
      .exists({ checkFalsy: true })
      .withMessage('Appointment date is required.')
      .bail()
      .isString()
      .withMessage('Appointment date must be text.')
      .bail()
      .custom((value) => {
        if (!isValidCalendarDate(value)) throw new Error('Please select a valid appointment date.');
        if (value < getTodayString()) throw new Error('Appointment date cannot be in the past.');
        return true;
      }),
    body('timeSlot')
      .exists({ checkFalsy: true })
      .withMessage('Time slot is required.')
      .bail()
      .isString()
      .withMessage('Time slot must be text.')
      .bail()
      .isIn(TIME_SLOTS)
      .withMessage('Please select a valid time slot.')
      .bail()
      .custom((value, { req }) => {
        if (isSunday(req.body.appointmentDate)) {
          throw new Error('Appointments are not available on Sunday.');
        }
        if (!allowPastSlotToday && isPastTodaySlot(req.body.appointmentDate, value)) {
          throw new Error('Please select a future appointment time.');
        }
        return true;
      }),
    body('consultationType')
      .exists({ checkFalsy: true })
      .withMessage('Consultation type is required.')
      .bail()
      .isString()
      .withMessage('Consultation type must be text.')
      .bail()
      .isIn(CONSULTATION_TYPES)
      .withMessage('Please select a valid consultation type.'),
    body('fullName')
      .exists({ checkFalsy: true })
      .withMessage('Full name is required.')
      .bail()
      .isString()
      .withMessage('Full name must be text.')
      .bail()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters.'),
    body('phoneNumber')
      .exists({ checkFalsy: true })
      .withMessage('Phone number is required.')
      .bail()
      .isString()
      .withMessage('Phone number must be text.')
      .bail()
      .trim()
      .custom((value) => {
        const compact = value.replace(/[\s-]/g, '');
        if (!PHONE_REGEX.test(compact)) throw new Error('Please enter a valid Indian phone number.');
        return true;
      }),
    emailRequired
      ? body('email')
          .exists({ checkFalsy: true })
          .withMessage('Email is required for appointment confirmation.')
          .bail()
          .isString()
          .withMessage('Email must be text.')
          .bail()
          .trim()
          .isEmail()
          .withMessage('Please enter a valid email address.')
          .bail()
          .isLength({ max: 254 })
          .withMessage('Email is too long.')
      : body('email')
          .optional({ values: 'falsy' })
          .isString()
          .withMessage('Email must be text.')
          .bail()
          .trim()
          .isEmail()
          .withMessage('Please enter a valid email address.')
          .bail()
          .isLength({ max: 254 })
          .withMessage('Email is too long.'),
    body('whatsappOptIn')
      .optional()
      .isBoolean({ strict: true })
      .withMessage('WhatsApp consent must be true or false.'),
  ];
}

export const appointmentValidationRules = appointmentFieldRules();

export const bookedSlotsQueryRules = [
  query('date')
    .exists({ checkFalsy: true })
    .withMessage('Date is required.')
    .bail()
    .isString()
    .withMessage('Date must be text.')
    .bail()
    .custom((value) => {
      if (!isValidCalendarDate(value)) throw new Error('Date must use YYYY-MM-DD format.');
      return true;
    }),
];

export function rejectUnknownFieldsFrom(allowedFields) {
  return (req, res, next) => {
    const unexpected = Object.keys(req.body || {}).filter((field) => !allowedFields.includes(field));
    if (unexpected.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unexpected field(s) in request: ${unexpected.join(', ')}.`,
      });
    }
    next();
  };
}

export const rejectUnknownAppointmentFields = rejectUnknownFieldsFrom([
  'appointmentDate',
  'timeSlot',
  'consultationType',
  'fullName',
  'phoneNumber',
  'email',
  'whatsappOptIn',
]);

export function handleAppointmentValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Please correct the submitted fields.',
      errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
    });
  }
  next();
}
