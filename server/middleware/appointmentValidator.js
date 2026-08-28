import { body, query, validationResult } from 'express-validator';
import {
  APPOINTMENT_SERVICES,
  TIME_SLOTS,
} from '../models/Appointment.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

function isValidCalendarDate(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export const appointmentValidationRules = [
  body('service')
    .exists({ checkFalsy: true })
    .withMessage('Service is required.')
    .bail()
    .isString()
    .withMessage('Service must be text.')
    .bail()
    .trim()
    .isIn(APPOINTMENT_SERVICES)
    .withMessage('Please select a valid service.'),

  body('appointmentDate')
    .exists({ checkFalsy: true })
    .withMessage('Appointment date is required.')
    .bail()
    .isString()
    .withMessage('Appointment date must be text.')
    .bail()
    .custom((value) => {
      if (!isValidCalendarDate(value)) {
        throw new Error('Please select a valid appointment date.');
      }

      if (value < getTodayString()) {
        throw new Error(
          'Appointment date cannot be in the past.'
        );
      }

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
    .withMessage('Please select a valid time slot.'),

  body('fullName')
    .exists({ checkFalsy: true })
    .withMessage('Full name is required.')
    .bail()
    .isString()
    .withMessage('Full name must be text.')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(
      'Full name must be between 2 and 100 characters.'
    ),

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

      if (!PHONE_REGEX.test(compact)) {
        throw new Error(
          'Please enter a valid Indian phone number.'
        );
      }

      return true;
    }),

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
    .bail()
    .isLength({ max: 254 })
    .withMessage('Email is too long.'),

  body('reasonForVisit')
    .optional({ nullable: true })
    .isString()
    .withMessage('Reason for visit must be text.')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      'Reason for visit must be under 1000 characters.'
    ),
];

export const bookedSlotsQueryRules = [
  query('date')
    .exists({ checkFalsy: true })
    .withMessage('Date is required.')
    .bail()
    .isString()
    .withMessage('Date must be text.')
    .bail()
    .custom((value) => {
      if (!isValidCalendarDate(value)) {
        throw new Error(
          'Date must use YYYY-MM-DD format.'
        );
      }

      return true;
    }),
];

export function rejectUnknownAppointmentFields(
  req,
  res,
  next
) {
  const allowedFields = [
    'service',
    'appointmentDate',
    'timeSlot',
    'fullName',
    'phoneNumber',
    'email',
    'reasonForVisit',
  ];

  const unexpected = Object.keys(req.body || {}).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unexpected.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unexpected field(s) in request: ${unexpected.join(
        ', '
      )}.`,
    });
  }

  next();
}

export function handleAppointmentValidationErrors(
  req,
  res,
  next
) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message:
        errors.array()[0]?.msg ||
        'Please correct the submitted fields.',

      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
}