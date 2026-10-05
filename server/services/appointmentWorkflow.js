import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { canReceiveWhatsApp } from './patientService.js';
import { cancelAppointmentEvent, createAppointmentEvent } from './googleCalendarService.js';
import {
  sendAppointmentConfirmationToClinic,
  sendAppointmentConfirmationToPatient,
  sendAppointmentReminderToPatient,
  sendFeedbackRequestToPatient,
} from './emailService.js';
import {
  sendClinicAlertWhatsApp,
  sendPatientConfirmationWhatsApp,
  sendPatientFeedbackWhatsApp,
  sendPatientReminderWhatsApp,
} from './whatsappService.js';

export class WorkflowError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = 'WorkflowError';
    this.status = status;
  }
}

const STALE_CLAIM_MS = 5 * 60 * 1000;
const AUTO_RETRYABLE = ['PENDING', 'FAILED', null];
const MANUAL_RETRYABLE = ['PENDING', 'FAILED', 'SKIPPED', null];

export const SKIPPED = Symbol('skipped');

function getFeedbackUrl() {
  const base = (process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');
  return `${base || 'https://sunaina-clinic.vercel.app'}/feedback`;
}

function logFailure(label, error) {
  console.error(label, { message: error.message, status: error.status });
}

async function claimStep(id, field, manual) {
  const retryable = manual ? MANUAL_RETRYABLE : AUTO_RETRYABLE;
  const clauses = [{ [field]: { $in: retryable } }];

  if (manual) {
    clauses.push({ [field]: 'SENDING', updatedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } });
  }

  return Appointment.findOneAndUpdate(
    { _id: id, $or: clauses },
    { $set: { [field]: 'SENDING' } },
    { returnDocument: 'after' }
  );
}

async function runStep(id, field, manual, action, doneStatus = 'SENT') {
  const claimed = await claimStep(id, field, manual);

  if (!claimed) {
    return null;
  }

  try {
    const outcome = await action(claimed);
    const status = outcome === SKIPPED ? 'SKIPPED' : doneStatus;
    await Appointment.updateOne({ _id: id }, { $set: { [field]: status } });
    return status;
  } catch (error) {
    logFailure(`APPOINTMENT STEP FAILED [${field}]`, error);
    await Appointment.updateOne({ _id: id }, { $set: { [field]: 'FAILED' } });
    return 'FAILED';
  }
}

async function loadPatient(appointment) {
  if (!appointment.patientId) return null;
  return Patient.findById(appointment.patientId);
}

async function syncCalendar(id, manual) {
  return runStep(
    id,
    'calendarStatus',
    manual,
    async (appointment) => {
      const isVirtual = appointment.consultationType === 'virtual';

      if (appointment.googleEventId && (!isVirtual || appointment.meetUrl)) {
        return undefined;
      }

      try {
        const { eventId, meetUrl } = await createAppointmentEvent(appointment);
        const update = { googleEventId: eventId };

        if (isVirtual) {
          update.meetUrl = meetUrl;
          update.meetingStatus = 'READY';

          if (appointment.patientEmailStatus === 'SENT') update.patientEmailStatus = 'PENDING';
          if (appointment.patientWhatsappStatus === 'SENT') update.patientWhatsappStatus = 'PENDING';
        }

        await Appointment.updateOne({ _id: appointment._id }, { $set: update });
        return undefined;
      } catch (error) {
        const update = {};
        if (error.eventId) update.googleEventId = error.eventId;
        if (isVirtual) update.meetingStatus = 'FAILED';

        if (Object.keys(update).length > 0) {
          await Appointment.updateOne({ _id: appointment._id }, { $set: update });
        }

        throw error;
      }
    },
    'READY'
  );
}

async function sendPatientEmail(id, field, manual, sender) {
  return runStep(id, field, manual, async (appointment) => {
    if (!appointment.email) return SKIPPED;
    await sender(appointment);
    return undefined;
  });
}

async function sendPatientWhatsApp(id, field, manual, sender) {
  return runStep(id, field, manual, async (appointment) => {
    const patient = await loadPatient(appointment);
    if (!canReceiveWhatsApp(patient)) return SKIPPED;
    await sender(appointment, patient.whatsappNumber);
    return undefined;
  });
}

export async function runConfirmationAutomation(id, { manual = false } = {}) {
  const appointment = await Appointment.findById(id).select('status').lean();

  if (!appointment || appointment.status !== 'CONFIRMED') {
    return;
  }

  await syncCalendar(id, manual);

  await sendPatientEmail(id, 'patientEmailStatus', manual, sendAppointmentConfirmationToPatient);

  await runStep(id, 'clinicEmailStatus', manual, async (current) => {
    await sendAppointmentConfirmationToClinic(current);
  });

  await sendPatientWhatsApp(id, 'patientWhatsappStatus', manual, sendPatientConfirmationWhatsApp);

  await runStep(id, 'clinicWhatsappStatus', manual, async (current) => {
    const result = await sendClinicAlertWhatsApp(current);
    return result ? undefined : SKIPPED;
  });
}

export async function sendReminder(id, { manual = false } = {}) {
  const appointment = await Appointment.findById(id).select('status').lean();

  if (!appointment || appointment.status !== 'CONFIRMED') {
    return;
  }

  await sendPatientEmail(id, 'reminderEmailStatus', manual, sendAppointmentReminderToPatient);
  await sendPatientWhatsApp(id, 'reminderWhatsappStatus', manual, sendPatientReminderWhatsApp);
}

export async function requestFeedback(id, { manual = false } = {}) {
  const appointment = await Appointment.findById(id).select('status feedbackEligible').lean();

  if (!appointment || appointment.status !== 'COMPLETED' || !appointment.feedbackEligible) {
    return;
  }

  await Appointment.updateOne(
    { _id: id, feedbackRequested: { $ne: true } },
    { $set: { feedbackRequested: true, feedbackRequestedAt: new Date() } }
  );

  const feedbackUrl = getFeedbackUrl();

  await sendPatientEmail(id, 'feedbackEmailStatus', manual, (current) =>
    sendFeedbackRequestToPatient(current, feedbackUrl)
  );

  await sendPatientWhatsApp(id, 'feedbackWhatsappStatus', manual, (current, to) =>
    sendPatientFeedbackWhatsApp(current, to, feedbackUrl)
  );
}

export async function confirmPayment(id, { method, amount, reference, user }) {
  const existing = await Appointment.findById(id).select('status fee').lean();

  if (!existing) {
    throw new WorkflowError('Appointment not found.', 404);
  }

  const update = {
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: method,
    paymentAmount: amount ?? existing.fee,
    paymentConfirmedAt: new Date(),
    paymentConfirmedBy: user.id,
    holdExpiresAt: null,
  };

  if (reference) update.paymentReference = reference;

  const confirmed = await Appointment.findOneAndUpdate(
    { _id: id, status: 'PENDING_PAYMENT' },
    { $set: update },
    { returnDocument: 'after', runValidators: true }
  );

  if (!confirmed) {
    throw new WorkflowError(`Payment cannot be confirmed for an appointment that is ${existing.status.replace('_', ' ').toLowerCase()}.`);
  }

  await runConfirmationAutomation(confirmed._id);

  return Appointment.findById(id);
}

export async function markAttendance(id, { status, user }) {
  if (!['COMPLETED', 'ABSENT'].includes(status)) {
    throw new WorkflowError('Attendance must be marked as completed or absent.', 400);
  }

  const existing = await Appointment.findById(id).select('status').lean();

  if (!existing) {
    throw new WorkflowError('Appointment not found.', 404);
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: id, status: 'CONFIRMED' },
    {
      $set: {
        status,
        attendanceMarkedBy: user.id,
        attendanceMarkedAt: new Date(),
        feedbackEligible: status === 'COMPLETED',
      },
    },
    { returnDocument: 'after' }
  );

  if (!updated) {
    throw new WorkflowError(`Attendance can only be marked for confirmed appointments. This appointment is ${existing.status.replace('_', ' ').toLowerCase()}.`);
  }

  if (status === 'COMPLETED') {
    await requestFeedback(id);
  }

  return Appointment.findById(id);
}

async function removeCalendarEvent(appointment) {
  if (!appointment.googleEventId || appointment.calendarStatus === 'CANCELLED') {
    return;
  }

  try {
    await cancelAppointmentEvent(appointment.googleEventId);
    await Appointment.updateOne({ _id: appointment._id }, { $set: { calendarStatus: 'CANCELLED' } });
  } catch (error) {
    logFailure('CALENDAR CANCEL FAILED', error);
    await Appointment.updateOne({ _id: appointment._id }, { $set: { calendarStatus: 'FAILED' } });
  }
}

export async function cancelAppointment(id, { reason, user }) {
  const existing = await Appointment.findById(id).select('status').lean();

  if (!existing) {
    throw new WorkflowError('Appointment not found.', 404);
  }

  const update = {
    status: 'CANCELLED',
    cancelledAt: new Date(),
    cancelledBy: user.id,
    feedbackEligible: false,
    holdExpiresAt: null,
  };

  if (reason) update.cancelReason = reason;

  const cancelled = await Appointment.findOneAndUpdate(
    { _id: id, status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] } },
    { $set: update, $unset: { slotKey: 1 } },
    { returnDocument: 'after' }
  );

  if (!cancelled) {
    throw new WorkflowError(`A ${existing.status.replace('_', ' ').toLowerCase()} appointment cannot be cancelled.`);
  }

  await removeCalendarEvent(cancelled);

  return Appointment.findById(id);
}

export async function retryAutomation(id) {
  const appointment = await Appointment.findById(id)
    .select('status googleEventId calendarStatus reminderEmailStatus reminderWhatsappStatus')
    .lean();

  if (!appointment) {
    throw new WorkflowError('Appointment not found.', 404);
  }

  if (appointment.status === 'CONFIRMED') {
    await runConfirmationAutomation(id, { manual: true });

    if ([appointment.reminderEmailStatus, appointment.reminderWhatsappStatus].includes('FAILED')) {
      await sendReminder(id, { manual: true });
    }
  } else if (appointment.status === 'COMPLETED') {
    await requestFeedback(id, { manual: true });
  } else if (appointment.status === 'CANCELLED' && appointment.googleEventId) {
    await removeCalendarEvent(appointment);
  } else {
    throw new WorkflowError('There is nothing to retry for this appointment.');
  }

  return Appointment.findById(id);
}
