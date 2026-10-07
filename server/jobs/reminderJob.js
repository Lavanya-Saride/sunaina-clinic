import Appointment from '../models/Appointment.js';
import { releaseExpiredHolds } from '../services/appointmentService.js';
import { recoverStaleSteps, sendConfirmationEmails, sendReminder, requestFeedback } from '../services/appointmentWorkflow.js';
import { recordProviderFailure, recordProviderSuccess } from '../utils/alerts.js';
import { logEvent } from '../utils/logger.js';

const INTERVAL_MS = 60 * 1000;
const INITIAL_DELAY_MS = 30 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_CONFIRMATION_AGE_MS = 3 * 60 * 60 * 1000;
const CONFIRMATION_EMAIL_DELAY_MS = 2 * 60 * 1000;
const FEEDBACK_EMAIL_DELAY_MS = 30 * 60 * 1000;
const BATCH_SIZE = 50;

let activeCycle = null;

export async function runReminderCycle(now = new Date()) {
  const recovered = await recoverStaleSteps(now);
  const released = await releaseExpiredHolds();
  let failed = 0;

  const confirmationDue = await Appointment.find({
    status: 'CONFIRMED',
    paymentConfirmedAt: { $lte: new Date(now.getTime() - CONFIRMATION_EMAIL_DELAY_MS) },
    $or: [
      { patientEmailStatus: { $in: ['PENDING', null] } },
      { clinicEmailStatus: { $in: ['PENDING', null] } },
    ],
  })
    .select('_id')
    .sort({ paymentConfirmedAt: 1 })
    .limit(BATCH_SIZE)
    .lean();

  for (const { _id } of confirmationDue) {
    try {
      await sendConfirmationEmails(_id);
    } catch (error) {
      failed += 1;
      logEvent('error', 'confirmation.email_failed', {
        appointmentId: String(_id),
        name: error.name,
        message: error.message,
      });
    }
  }

  const feedbackDue = await Appointment.find({
    status: 'COMPLETED',
    feedbackEligible: true,
    attendanceMarkedAt: { $lte: new Date(now.getTime() - FEEDBACK_EMAIL_DELAY_MS) },
    feedbackRequested: { $ne: true },
    $or: [
      { feedbackEmailStatus: { $in: ['PENDING', null] } },
      { feedbackWhatsappStatus: { $in: ['PENDING', null] } },
    ],
  })
    .select('_id')
    .sort({ attendanceMarkedAt: 1 })
    .limit(BATCH_SIZE)
    .lean();

  for (const { _id } of feedbackDue) {
    try {
      await requestFeedback(_id);
    } catch (error) {
      failed += 1;
      logEvent('error', 'feedback.request_failed', {
        appointmentId: String(_id),
        name: error.name,
        message: error.message,
      });
    }
  }

  const due = await Appointment.find({
    status: 'CONFIRMED',
    startsAt: { $gt: now, $lte: new Date(now.getTime() + WINDOW_MS) },
    paymentConfirmedAt: { $lte: new Date(now.getTime() - MIN_CONFIRMATION_AGE_MS) },
    $or: [
      { reminderEmailStatus: { $in: ['PENDING', null] } },
      { reminderWhatsappStatus: { $in: ['PENDING', null] } },
    ],
  })
    .select('_id')
    .sort({ startsAt: 1 })
    .limit(BATCH_SIZE)
    .lean();

  for (const { _id } of due) {
    try {
      await sendReminder(_id);
    } catch (error) {
      failed += 1;
      logEvent('error', 'reminder.appointment_failed', {
        appointmentId: String(_id),
        name: error.name,
        message: error.message,
      });
    }
  }

  logEvent('info', 'reminder.cycle', {
    confirmationEmailsDue: confirmationDue.length,
    feedbackDue: feedbackDue.length,
    due: due.length,
    failed,
    holdsReleased: released?.modifiedCount ?? 0,
    staleStepsRecovered: recovered,
  });

  return due.length;
}

async function guardedCycle() {
  if (activeCycle) return;

  activeCycle = runReminderCycle()
    .then(() => recordProviderSuccess('reminders'))
    .catch((error) => {
      logEvent('error', 'reminder.cycle_failed', { name: error.name, message: error.message });
      recordProviderFailure('reminders', { step: 'cycle' });
    })
    .finally(() => {
      activeCycle = null;
    });

  await activeCycle;
}

export function startReminderJob() {
  if (process.env.REMINDERS_ENABLED === 'false') {
    return null;
  }

  const interval = setInterval(guardedCycle, INTERVAL_MS);
  const initial = setTimeout(guardedCycle, INITIAL_DELAY_MS);

  interval.unref();
  initial.unref();

  return { interval, initial };
}

export async function stopReminderJob(timers) {
  if (timers) {
    clearInterval(timers.interval);
    clearTimeout(timers.initial);
  }

  if (activeCycle) {
    await activeCycle;
  }
}
