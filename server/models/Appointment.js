import mongoose from 'mongoose';
import { APPOINTMENT_FEE, APPOINTMENT_DURATION_MINUTES, PAYMENT_HOLD_MINUTES, CONSULTATION_TYPES } from '../config/appointmentConfig.js';

export const TIME_SLOTS = [
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
];

export { APPOINTMENT_FEE, APPOINTMENT_DURATION_MINUTES, PAYMENT_HOLD_MINUTES, CONSULTATION_TYPES };

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      immutable: true,
    },
    appointmentDate: {
      type: String,
      required: [true, 'Appointment date is required.'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Appointment date must use YYYY-MM-DD format.'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required.'],
      enum: {
        values: TIME_SLOTS,
        message: 'Please select a valid time slot.',
      },
    },
    consultationType: {
      type: String,
      required: [true, 'Consultation type is required.'],
      enum: {
        values: CONSULTATION_TYPES,
        message: 'Please select a valid consultation type.',
      },
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters.'],
      maxlength: [100, 'Full name must be under 100 characters.'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      maxlength: [25, 'Phone number is too long.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email is too long.'],
    },
    fee: {
      type: Number,
      required: true,
      default: APPOINTMENT_FEE,
      immutable: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      immutable: true,
    },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'CREATED',
      index: true,
    },
    paymentOrderId: {
      type: String,
      default: '',
      index: true,
    },
    paymentId: {
      type: String,
      default: '',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    googleEventId: {
      type: String,
      default: '',
    },
    meetUrl: {
      type: String,
      default: '',
    },
    meetingStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'READY', 'FAILED'],
      default: 'PENDING',
    },
    patientEmailStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    clinicEmailStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    patientWhatsappStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    clinicWhatsappStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index(
  { appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    name: 'unique_appointment_date_time_slot',
  }
);

export default mongoose.model('Appointment', appointmentSchema);
