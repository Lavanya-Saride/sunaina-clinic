import mongoose from 'mongoose';
import {
  APPOINTMENT_FEE,
  APPOINTMENT_DURATION_MINUTES,
  PAYMENT_HOLD_HOURS,
  CONSULTATION_TYPES,
  PAYMENT_METHODS,
} from '../config/appointmentConfig.js';
import { getSlotStart } from '../utils/appointmentTime.js';
import { normalizePhone } from '../utils/phone.js';

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

export const APPOINTMENT_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'ABSENT', 'CANCELLED'];
export const PAYMENT_STATUSES = ['CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];
export const APPOINTMENT_SOURCES = ['WEBSITE', 'OFFLINE'];
export const NOTIFICATION_STATUSES = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'];

export { APPOINTMENT_FEE, APPOINTMENT_DURATION_MINUTES, PAYMENT_HOLD_HOURS, CONSULTATION_TYPES };

const notificationField = {
  type: String,
  enum: NOTIFICATION_STATUSES,
  default: 'PENDING',
};

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
    startsAt: {
      type: Date,
      index: true,
    },
    slotKey: {
      type: String,
    },
    consultationType: {
      type: String,
      required: [true, 'Consultation type is required.'],
      enum: {
        values: CONSULTATION_TYPES,
        message: 'Please select a valid consultation type.',
      },
    },
    source: {
      type: String,
      enum: APPOINTMENT_SOURCES,
      default: 'WEBSITE',
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters.'],
      maxlength: [100, 'Full name must be under 100 characters.'],
    },
    fullNameKey: {
      type: String,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      maxlength: [25, 'Phone number is too long.'],
    },
    phoneNormalized: {
      type: String,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email is too long.'],
      default: '',
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
      enum: APPOINTMENT_STATUSES,
      default: 'PENDING_PAYMENT',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: [...PAYMENT_METHODS, 'RAZORPAY'],
    },
    paymentAmount: {
      type: Number,
      min: 0,
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    paymentConfirmedAt: {
      type: Date,
    },
    paymentConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    attendanceMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attendanceMarkedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    feedbackEligible: {
      type: Boolean,
      default: false,
    },
    feedbackRequested: {
      type: Boolean,
      default: false,
    },
    feedbackRequestedAt: {
      type: Date,
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
    calendarStatus: {
      type: String,
      enum: ['PENDING', 'SENDING', 'READY', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    patientEmailStatus: notificationField,
    clinicEmailStatus: notificationField,
    patientWhatsappStatus: notificationField,
    clinicWhatsappStatus: notificationField,
    reminderEmailStatus: notificationField,
    reminderWhatsappStatus: notificationField,
    feedbackEmailStatus: notificationField,
    feedbackWhatsappStatus: notificationField,
  },
  {
    timestamps: true,
  }
);

appointmentSchema.pre('validate', function deriveFields() {
  if (this.appointmentDate && this.timeSlot && TIME_SLOTS.includes(this.timeSlot)) {
    this.startsAt = getSlotStart(this.appointmentDate, this.timeSlot);
  }

  if (this.isNew && this.status !== 'CANCELLED' && this.appointmentDate && this.timeSlot) {
    this.slotKey = `${this.appointmentDate}|${this.timeSlot}`;
  }

  if (this.fullName) {
    this.fullNameKey = this.fullName.trim().toLowerCase();
  }

  if (this.phoneNumber) {
    this.phoneNormalized = normalizePhone(this.phoneNumber);
  }
});

appointmentSchema.index({ slotKey: 1 }, { unique: true, sparse: true, name: 'unique_active_slot' });
appointmentSchema.index({ status: 1, startsAt: 1 });
appointmentSchema.index({ createdAt: -1 });

export default mongoose.model('Appointment', appointmentSchema);
