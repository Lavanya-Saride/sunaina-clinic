import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { hasPermission } from '../config/permissions.js';
import {
  createAppointmentRecord,
  listAppointments,
} from '../services/appointmentService.js';
import {
  cancelAppointment,
  confirmPayment,
  markAttendance,
  retryAutomation,
} from '../services/appointmentWorkflow.js';
import { normalizePhone } from '../utils/phone.js';
import { sanitizePlainText } from '../utils/sanitize.js';

function personName(value) {
  return value && typeof value === 'object' ? value.name || '' : '';
}

export function serializeAppointment(doc) {
  const patient = doc.patientId && typeof doc.patientId === 'object' && doc.patientId.whatsappOptIn !== undefined
    ? doc.patientId
    : null;

  return {
    id: doc._id.toString(),
    appointmentNumber: doc.appointmentNumber,
    appointmentDate: doc.appointmentDate,
    timeSlot: doc.timeSlot,
    startsAt: doc.startsAt,
    consultationType: doc.consultationType,
    source: doc.source || 'WEBSITE',
    status: doc.status,
    fullName: doc.fullName,
    phoneNumber: doc.phoneNumber,
    email: doc.email || '',
    fee: doc.fee,
    currency: doc.currency,
    paymentStatus: doc.paymentStatus,
    paymentMethod: doc.paymentMethod || '',
    paymentAmount: doc.paymentAmount ?? null,
    paymentReference: doc.paymentReference || '',
    paymentConfirmedAt: doc.paymentConfirmedAt || null,
    paymentConfirmedBy: personName(doc.paymentConfirmedBy),
    holdExpiresAt: doc.holdExpiresAt || null,
    attendanceMarkedAt: doc.attendanceMarkedAt || null,
    attendanceMarkedBy: personName(doc.attendanceMarkedBy),
    cancelledAt: doc.cancelledAt || null,
    cancelReason: doc.cancelReason || '',
    feedbackEligible: Boolean(doc.feedbackEligible),
    feedbackRequested: Boolean(doc.feedbackRequested),
    feedbackRequestedAt: doc.feedbackRequestedAt || null,
    meetUrl: doc.meetUrl || '',
    meetingStatus: doc.meetingStatus,
    calendarStatus: doc.calendarStatus || 'PENDING',
    whatsappOptIn: Boolean(patient?.whatsappOptIn) && !patient?.whatsappOptOutAt,
    notifications: {
      patientEmail: doc.patientEmailStatus || 'PENDING',
      clinicEmail: doc.clinicEmailStatus || 'PENDING',
      patientWhatsapp: doc.patientWhatsappStatus || 'PENDING',
      clinicWhatsapp: doc.clinicWhatsappStatus || 'PENDING',
      reminderEmail: doc.reminderEmailStatus || 'PENDING',
      reminderWhatsapp: doc.reminderWhatsappStatus || 'PENDING',
      feedbackEmail: doc.feedbackEmailStatus || 'PENDING',
      feedbackWhatsapp: doc.feedbackWhatsappStatus || 'PENDING',
    },
    createdAt: doc.createdAt,
  };
}

async function loadSerialized(id) {
  const doc = await Appointment.findById(id)
    .populate('paymentConfirmedBy', 'name')
    .populate('attendanceMarkedBy', 'name')
    .populate('patientId', 'whatsappOptIn whatsappOptOutAt')
    .lean();

  return serializeAppointment(doc);
}

export async function getAppointments(req, res, next) {
  try {
    const { items, counts, pagination } = await listAppointments(req.query);

    return res.status(200).json({
      success: true,
      data: items.map(serializeAppointment),
      counts,
      pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createOfflineAppointment(req, res, next) {
  try {
    const { payment } = req.body;

    if (payment && !hasPermission(req.user.role, 'payments:confirm')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to record payments.',
      });
    }

    const appointment = await createAppointmentRecord({
      appointmentDate: req.body.appointmentDate,
      timeSlot: req.body.timeSlot,
      consultationType: req.body.consultationType,
      fullName: req.body.fullName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      source: 'OFFLINE',
      whatsappOptIn: req.body.whatsappOptIn === true,
      optInSource: 'DASHBOARD',
      withHold: false,
    });

    if (payment) {
      await confirmPayment(appointment._id, {
        method: payment.method,
        amount: payment.amount,
        reference: sanitizePlainText(payment.reference || ''),
        user: req.user,
      });
    }

    return res.status(201).json({
      success: true,
      data: await loadSerialized(appointment._id),
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmAppointmentPayment(req, res, next) {
  try {
    await confirmPayment(req.params.id, {
      method: req.body.method,
      amount: req.body.amount,
      reference: sanitizePlainText(req.body.reference || ''),
      user: req.user,
    });

    return res.status(200).json({ success: true, data: await loadSerialized(req.params.id) });
  } catch (error) {
    return next(error);
  }
}

export async function setAttendance(req, res, next) {
  try {
    await markAttendance(req.params.id, { status: req.body.status, user: req.user });
    return res.status(200).json({ success: true, data: await loadSerialized(req.params.id) });
  } catch (error) {
    return next(error);
  }
}

export async function cancelAppointmentById(req, res, next) {
  try {
    await cancelAppointment(req.params.id, {
      reason: sanitizePlainText(req.body.reason || ''),
      user: req.user,
    });

    return res.status(200).json({ success: true, data: await loadSerialized(req.params.id) });
  } catch (error) {
    return next(error);
  }
}

export async function retryAppointmentAutomation(req, res, next) {
  try {
    await retryAutomation(req.params.id);
    return res.status(200).json({ success: true, data: await loadSerialized(req.params.id) });
  } catch (error) {
    return next(error);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchPatients(req, res, next) {
  try {
    const search = req.query.search.trim();
    const digits = search.replace(/\D/g, '');
    const clauses = [{ name: new RegExp(escapeRegex(search), 'i') }];

    if (digits.length >= 3) {
      const phoneDigits = digits.length === 10 ? normalizePhone(digits) : digits;
      clauses.push({ whatsappNumber: new RegExp(escapeRegex(phoneDigits)) });
    }

    const patients = await Patient.find({ $or: clauses })
      .sort({ name: 1 })
      .limit(10)
      .select('name whatsappNumber email whatsappOptIn source')
      .lean();

    return res.status(200).json({
      success: true,
      data: patients.map((patient) => ({
        id: patient._id.toString(),
        name: patient.name,
        whatsappNumber: patient.whatsappNumber,
        email: patient.email || '',
        whatsappOptIn: patient.whatsappOptIn,
        source: patient.source,
      })),
    });
  } catch (error) {
    return next(error);
  }
}
