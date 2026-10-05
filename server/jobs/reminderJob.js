import Appointment from '../models/Appointment.js';
import { sendReminder } from '../services/appointmentWorkflow.js';

const INTERVAL_MS = 15 * 60 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_CONFIRMATION_AGE_MS = 3 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

export async function runReminderCycle(now = new Date()) {
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
    .limit(BATCH_SIZE)
    .lean();

  for (const { _id } of due) {
    await sendReminder(_id);
  }

  return due.length;
}

export function startReminderJob() {
  if (process.env.REMINDERS_ENABLED === 'false') {
    return null;
  }

  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;

    try {
      await runReminderCycle();
    } catch (error) {
      console.error('REMINDER JOB FAILED', { message: error.message });
    } finally {
      running = false;
    }
  }, INTERVAL_MS);

  timer.unref();
  return timer;
}
