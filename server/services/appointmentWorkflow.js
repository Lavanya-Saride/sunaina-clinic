import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { canReceiveWhatsApp } from './patientService.js';
import {
  cancelAppointmentEvent,
  createAppointmentEvent,
  getAppointmentEventId,
} from './googleCalendarService.js';
import {
  sendAppointmentConfirmationToClinic,
  sendNewAppointmentToClinic,
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
import { recordProviderFailure, recordProviderSuccess } from '../utils/alerts.js';
import { logEvent } from '../utils/logger.js';
import { RECIPIENT_NOT_ALLOWED } from '../utils/recipientPolicy.js';

export class WorkflowError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = 'WorkflowError';
    this.status = status;
  }
}

export const STALE_CLAIM_MS = 5 * 60 * 1000;
const STEP_FIELDS = [
  'calendarStatus',
  'patientEmailStatus',
  'clinicEmailStatus',
  'patientWhatsappStatus',
  'clinicWhatsappStatus',
  'reminderEmailStatus',
  'reminderWhatsappStatus',
  'feedbackEmailStatus',
  'feedbackWhatsappStatus',
];
const AUTO_RETRYABLE = ['PENDING', 'FAILED', null];
const MANUAL_RETRYABLE = ['PENDING', 'FAILED', 'SKIPPED', null];

export const SKIPPED = Symbol('skipped');

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i;

export function getFeedbackUrl() {
  const origins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const base = origins.find((origin) => !LOCAL_ORIGIN.test(origin)) || origins[0];
  return `${base || 'https://sunaina-clinic.vercel.app'}/feedback`;
}

function providerFor(field) {
  if (field === 'calendarStatus') return 'calendar';
  return field.endsWith('EmailStatus') ? 'gmail' : 'whatsapp';
}

function logFailure(event, error, fields = {}) {
  logEvent('error', event, {
    ...fields,
    status: error.status,
    code: error.code,
    message: error.message,
  });
}

async function claimStep(id, field, manual, requiredStatus) {
  const retryable = manual ? MANUAL_RETRYABLE : AUTO_RETRYABLE;
  const clauses = [{ [field]: { $in: retryable } }];

  if (manual) {
    clauses.push({ [field]: 'SENDING', updatedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } });
  }

  const filter = { _id: id, $or: clauses };

  if (requiredStatus) {
    filter.status = requiredStatus;
  }

  return Appointment.findOneAndUpdate(
    filter,
    { $set: { [field]: 'SENDING' } },
    { returnDocument: 'after' }
  );
}

async function runStep(id, field, manual, action, { doneStatus = 'SENT', requiredStatus } = {}) {
  const claimed = await claimStep(id, field, manual, requiredStatus);

  if (!claimed) {
    return null;
  }

  const provider = providerFor(field);

  try {
    const outcome = await action(claimed);
    let status = doneStatus;

    if (outcome === SKIPPED) {
      status = 'SKIPPED';
    } else if (typeof outcome === 'string') {
      status = outcome;
    }

    await Appointment.updateOne({ _id: id, [field]: 'SENDING' }, { $set: { [field]: status } });

    if (status !== 'SKIPPED') {
      recordProviderSuccess(provider);
    }

    return status;
  } catch (error) {
    if (error.code === RECIPIENT_NOT_ALLOWED) {
      logEvent('info', 'outbound.recipient_blocked', { step: field, provider });
      await Appointment.updateOne({ _id: id, [field]: 'SENDING' }, { $set: { [field]: 'SKIPPED' } });
      return 'SKIPPED';
    }

    logFailure('appointment.step_failed', error, {
      step: field,
      provider,
      appointmentId: String(id),
      outcomeUnknown: error.code === 'PROVIDER_TIMEOUT',
    });
    recordProviderFailure(provider, { step: field });
    await Appointment.updateOne({ _id: id, [field]: 'SENDING' }, { $set: { [field]: 'FAILED' } });
    return 'FAILED';
  }
}

export async function recoverStaleSteps(now = new Date()) {
  const cutoff = new Date(now.getTime() - STALE_CLAIM_MS);

  const stuck = await Appointment.find({
    updatedAt: { $lt: cutoff },
    $or: STEP_FIELDS.map((field) => ({ [field]: 'SENDING' })),
  })
    .select(STEP_FIELDS.join(' '))
    .limit(100)
    .lean();

  let recovered = 0;

  for (const doc of stuck) {
    for (const field of STEP_FIELDS) {
      if (doc[field] !== 'SENDING') continue;

      const result = await Appointment.updateOne(
        { _id: doc._id, [field]: 'SENDING', updatedAt: { $lt: cutoff } },
        { $set: { [field]: 'FAILED' } },
        { timestamps: false }
      );

      if (result.modifiedCount > 0) {
        recovered += 1;
        logEvent('warn', 'appointment.stale_step_recovered', {
          appointmentId: String(doc._id),
          step: field,
          outcomeUnknown: true,
        });
      }
    }
  }

  return recovered;
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

      let created;

      try {
        created = await createAppointmentEvent(appointment);
        const update = { googleEventId: created.eventId };

        if (isVirtual) {
          update.meetUrl = created.meetUrl;
          update.meetingStatus = 'READY';

          if (appointment.patientEmailStatus === 'SENT') update.patientEmailStatus = 'PENDING';
          if (appointment.patientWhatsappStatus === 'SENT') update.patientWhatsappStatus = 'PENDING';
        }

        await Appointment.updateOne({ _id: appointment._id }, { $set: update });
      } catch (error) {
        const update = {};
        if (error.eventId) update.googleEventId = error.eventId;
        if (isVirtual) update.meetingStatus = 'FAILED';

        if (Object.keys(update).length > 0) {
          await Appointment.updateOne({ _id: appointment._id }, { $set: update });
        }

        throw error;
      }

      const latest = await Appointment.findById(appointment._id).select('status').lean();

      if (latest?.status === 'CANCELLED') {
        await cancelAppointmentEvent(created.eventId);
        return 'CANCELLED';
      }

      return undefined;
    },
    { doneStatus: 'READY', requiredStatus: 'CONFIRMED' }
  );
}

async function sendPatientEmail(id, field, manual, requiredStatus, sender) {
  return runStep(
    id,
    field,
    manual,
    async (appointment) => {
      if (!appointment.email) return SKIPPED;
      await sender(appointment);
      return undefined;
    },
    { requiredStatus }
  );
}

async function sendPatientWhatsApp(id, field, manual, requiredStatus, sender) {
  return runStep(
    id,
    field,
    manual,
    async (appointment) => {
      const patient = await loadPatient(appointment);
      if (!canReceiveWhatsApp(patient)) return SKIPPED;
      await sender(appointment, patient.whatsappNumber);
      return undefined;
    },
    { requiredStatus }
  );
}


export async function sendConfirmationEmails(id, { manual = false } = {}) {
  await sendPatientEmail(id, 'patientEmailStatus', manual, 'CONFIRMED', sendAppointmentConfirmationToPatient);

  await runStep(
    id,
    'clinicEmailStatus',
    manual,
    async (current) => {
      await sendAppointmentConfirmationToClinic(current);
    },
    { requiredStatus: 'CONFIRMED' }
  );
}

export async function runConfirmationAutomation(id, { manual = false } = {}) {
  const appointment = await Appointment.findById(id).select('status').lean();

  if (!appointment || appointment.status !== 'CONFIRMED') {
    return;
  }

  await syncCalendar(id, manual);

  await sendPatientWhatsApp(id, 'patientWhatsappStatus', manual, 'CONFIRMED', sendPatientConfirmationWhatsApp);

  await runStep(
    id,
    'clinicWhatsappStatus',
    manual,
    async (current) => {
      const result = await sendClinicAlertWhatsApp(current);
      return result ? undefined : SKIPPED;
    },
    { requiredStatus: 'CONFIRMED' }
  );
}

export async function sendReminder(id, { manual = false } = {}) {
  const appointment = await Appointment.findById(id).select('status').lean();

  if (!appointment || appointment.status !== 'CONFIRMED') {
    return;
  }

  await sendPatientEmail(id, 'reminderEmailStatus', manual, 'CONFIRMED', sendAppointmentReminderToPatient);
  await sendPatientWhatsApp(id, 'reminderWhatsappStatus', manual, 'CONFIRMED', sendPatientReminderWhatsApp);
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

  await sendPatientEmail(id, 'feedbackEmailStatus', manual, 'COMPLETED', (current) =>
    sendFeedbackRequestToPatient(current, feedbackUrl)
  );

  await sendPatientWhatsApp(id, 'feedbackWhatsappStatus', manual, 'COMPLETED', (current, to) =>
    sendPatientFeedbackWhatsApp(current, to, feedbackUrl)
  );
}

export async function confirmPayment(id, { user }) {
  const existing = await Appointment.findById(id).select('status fee').lean();

  if (!existing) {
    throw new WorkflowError('Appointment not found.', 404);
  }

  const update = {
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentAmount: existing.fee,
    paymentConfirmedAt: new Date(),
    paymentConfirmedBy: user.id,
    holdExpiresAt: null,
  };

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

  return Appointment.findById(id);
}

function calendarEventIdToRemove(appointment) {
  if (appointment.googleEventId) return appointment.googleEventId;
  return ['SENDING', 'FAILED'].includes(appointment.calendarStatus) ? getAppointmentEventId(appointment._id) : '';
}

async function removeCalendarEvent(appointment) {
  const eventId = calendarEventIdToRemove(appointment);

  if (!eventId || appointment.calendarStatus === 'CANCELLED') {
    return;
  }

  try {
    await cancelAppointmentEvent(eventId);
    await Appointment.updateOne({ _id: appointment._id }, { $set: { calendarStatus: 'CANCELLED' } });
  } catch (error) {
    logFailure('appointment.calendar_cancel_failed', error, { appointmentId: String(appointment._id) });
    recordProviderFailure('calendar', { step: 'calendarCancel' });
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
    await sendConfirmationEmails(id, { manual: true });

    if ([appointment.reminderEmailStatus, appointment.reminderWhatsappStatus].includes('FAILED')) {
      await sendReminder(id, { manual: true });
    }
  } else if (appointment.status === 'COMPLETED') {
    await requestFeedback(id, { manual: true });
  } else if (appointment.status === 'CANCELLED' && calendarEventIdToRemove(appointment)) {
    await removeCalendarEvent(appointment);
  } else {
    throw new WorkflowError('There is nothing to retry for this appointment.');
  }

  return Appointment.findById(id);
}
