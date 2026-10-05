import { randomBytes } from 'node:crypto';
import Appointment from '../models/Appointment.js';
import { PAYMENT_HOLD_HOURS, getConsultationFee } from '../config/appointmentConfig.js';
import { upsertPatient } from './patientService.js';
import { sanitizePlainText } from '../utils/sanitize.js';

export class SlotUnavailableError extends Error {
  constructor() {
    super('This time slot has already been booked. Please select another time.');
    this.name = 'SlotUnavailableError';
    this.status = 409;
  }
}

function generateAppointmentNumber(appointmentDate) {
  const compactDate = appointmentDate.replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `SC${compactDate}${suffix}`;
}

export async function releaseExpiredHolds(filter = {}) {
  return Appointment.updateMany(
    {
      ...filter,
      status: 'PENDING_PAYMENT',
      holdExpiresAt: { $lte: new Date() },
    },
    {
      $set: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Payment hold expired',
      },
      $unset: { slotKey: 1 },
    }
  );
}

export async function getUnavailableSlots(date) {
  const appointments = await Appointment.find({
    appointmentDate: date,
    slotKey: { $exists: true },
    $or: [
      { status: { $in: ['CONFIRMED', 'COMPLETED', 'ABSENT'] } },
      { status: 'PENDING_PAYMENT', holdExpiresAt: null },
      { status: 'PENDING_PAYMENT', holdExpiresAt: { $gt: new Date() } },
    ],
  })
    .select('timeSlot -_id')
    .lean();

  return appointments.map(({ timeSlot }) => timeSlot);
}

export async function createAppointmentRecord({
  appointmentDate,
  timeSlot,
  consultationType,
  fullName,
  phoneNumber,
  email,
  source,
  whatsappOptIn,
  optInSource,
  withHold,
}) {
  await releaseExpiredHolds({ appointmentDate, timeSlot });

  const slotTaken = await Appointment.exists({ slotKey: `${appointmentDate}|${timeSlot}` });

  if (slotTaken) {
    throw new SlotUnavailableError();
  }

  const patient = await upsertPatient({
    name: fullName,
    phone: phoneNumber,
    email,
    source,
    whatsappOptIn,
    optInSource,
  });

  try {
    return await Appointment.create({
      appointmentNumber: generateAppointmentNumber(appointmentDate),
      appointmentDate,
      timeSlot,
      consultationType,
      source,
      patientId: patient._id,
      fullName: sanitizePlainText(fullName),
      phoneNumber: sanitizePlainText(phoneNumber),
      email: sanitizePlainText(email || '').toLowerCase(),
      fee: getConsultationFee(consultationType),
      currency: 'INR',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      holdExpiresAt: withHold ? new Date(Date.now() + PAYMENT_HOLD_HOURS * 60 * 60 * 1000) : null,
      meetingStatus: consultationType === 'virtual' ? 'PENDING' : 'NOT_REQUIRED',
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new SlotUnavailableError();
    }
    throw error;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORT_FIELDS = {
  appointmentDateTime: 'startsAt',
  createdAt: 'createdAt',
  patientName: 'fullNameKey',
};

export function buildAppointmentFilter(query, { includeStatus = true } = {}) {
  const filter = {};

  if (includeStatus && query.status) {
    filter.status = query.status;
  }

  if (query.date) {
    filter.appointmentDate = query.date;
  } else if (query.dateFrom || query.dateTo) {
    filter.appointmentDate = {};
    if (query.dateFrom) filter.appointmentDate.$gte = query.dateFrom;
    if (query.dateTo) filter.appointmentDate.$lte = query.dateTo;
  }

  if (query.consultationType) filter.consultationType = query.consultationType;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.source) filter.source = query.source;

  const search = (query.search || '').trim();

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const digits = search.replace(/\D/g, '');
    const clauses = [{ fullName: pattern }, { appointmentNumber: pattern }];

    if (digits.length >= 3) {
      clauses.push({ phoneNormalized: new RegExp(escapeRegex(digits)) });
    }

    filter.$or = clauses;
  }

  return filter;
}

export async function listAppointments(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
  const sortField = SORT_FIELDS[query.sortBy] || SORT_FIELDS.appointmentDateTime;
  const direction = query.sortOrder === 'desc' ? -1 : 1;

  const filter = buildAppointmentFilter(query);

  const [items, total, groups] = await Promise.all([
    Appointment.find(filter)
      .sort({ [sortField]: direction, _id: direction })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('paymentConfirmedBy', 'name')
      .populate('attendanceMarkedBy', 'name')
      .populate('patientId', 'whatsappOptIn whatsappOptOutAt source')
      .lean(),
    Appointment.countDocuments(filter),
    Appointment.aggregate([
      { $match: buildAppointmentFilter(query, { includeStatus: false }) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = Object.fromEntries(groups.map(({ _id, count }) => [_id, count]));

  return {
    items,
    counts,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
  };
}
