import Appointment from '../models/Appointment.js';
import { releaseExpiredHolds } from '../services/appointmentService.js';
import { recoverStaleSteps, sendReminder } from '../services/appointmentWorkflow.js';
import { recordProviderFailure, recordProviderSuccess } from '../utils/alerts.js';
import { logEvent } from '../utils/logger.js';

const INTERVAL_MS = 15 * 60 * 1000;
const INITIAL_DELAY_MS = 30 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_CONFIRMATION_AGE_MS = 3 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

let activeCycle = null;

export async function runReminderCycle(now = new Date()) {
  const recovered = await recoverStaleSteps(now);
  const released = await releaseExpiredHolds();

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

  let failed = 0;

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
