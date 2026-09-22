import { body, query, validationResult } from 'express-validator';
import { TIME_SLOTS } from '../models/Appointment.js';
import { CONSULTATION_TYPES } from '../config/appointmentConfig.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

function isValidCalendarDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function getTodayString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(({ type }) => type === 'year')?.value;
  const month = parts.find(({ type }) => type === 'month')?.value;
  const day = parts.find(({ type }) => type === 'day')?.value;
  return `${year}-${month}-${day}`;
}


function getMinutesFromTimeSlot(value) {
  const [time, period] = value.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour = hours;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minutes;
}

function isSunday(value) {
  return new Date(`${value}T12:00:00+05:30`).getUTCDay() === 0;
}

function isPastTodaySlot(date, slot) {
  if (date !== getTodayString()) return false;
  const nowParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const currentMinutes = Number(nowParts.find(({ type }) => type === 'hour')?.value) * 60 + Number(nowParts.find(({ type }) => type === 'minute')?.value);
  return getMinutesFromTimeSlot(slot) <= currentMinutes;
}

export const appointmentValidationRules = [
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
      if (isPastTodaySlot(req.body.appointmentDate, value)) {
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
  body('email')
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
    .withMessage('Email is too long.'),
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
      if (!isValidCalendarDate(value)) throw new Error('Date must use YYYY-MM-DD format.');
      return true;
    }),
];

export function rejectUnknownAppointmentFields(req, res, next) {
  const allowedFields = ['appointmentDate', 'timeSlot', 'consultationType', 'fullName', 'phoneNumber', 'email'];
  const unexpected = Object.keys(req.body || {}).filter((field) => !allowedFields.includes(field));
  if (unexpected.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unexpected field(s) in request: ${unexpected.join(', ')}.`,
    });
  }
  next();
}

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
