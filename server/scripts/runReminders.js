import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { runReminderCycle } from '../jobs/reminderJob.js';
import { logEvent } from '../utils/logger.js';

async function main() {
  await connectDB();
  const due = await runReminderCycle();
  logEvent('info', 'reminder.run_once_finished', { due });
}

main()
  .catch((error) => {
    logEvent('error', 'reminder.run_once_failed', { name: error.name, message: error.message });
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
