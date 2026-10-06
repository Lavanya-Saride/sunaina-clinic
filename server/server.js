import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import connectDB from './config/db.js';
import { runMigrations } from './config/migrations.js';
import { validateEnv } from './config/validateEnv.js';
import { startReminderJob, stopReminderJob } from './jobs/reminderJob.js';

import feedbackRoutes from './routes/feedbackRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';
import googlePlacesRoutes from './routes/googlePlacesRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

import {
  notFound,
  errorHandler,
} from './middleware/errorHandler.js';

import { BACKGROUND_POLL_HEADER } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { logEvent } from './utils/logger.js';

const SHUTDOWN_GRACE_MS = 25000;

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const configuredOrigins = (
  process.env.CLIENT_URL || ''
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://sunaina-clinic.vercel.app',
  ...configuredOrigins,
].filter(
  (origin, index, origins) =>
    origins.indexOf(origin) === index
);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin
    .trim()
    .replace(/\/$/, '');

  if (allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  try {
    const url = new URL(normalizedOrigin);

    if (url.protocol !== 'https:') {
      return false;
    }

    if (url.hostname.endsWith('.vercel.app')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const app = express();

app.disable('x-powered-by');

app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },

    methods: ['GET', 'POST', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      BACKGROUND_POLL_HEADER,
    ],

    optionsSuccessStatus: 204,
  })
);

app.use(express.json({
  limit: '10kb',
  strict: true,
  verify(req, res, buffer) {
    if (req.originalUrl === '/api/whatsapp/webhook') {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));

app.use(cookieParser());

app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);

app.use('/api/feedback', feedbackRoutes);

app.use('/api/appointment', appointmentRoutes);

app.use('/api/contact', contactRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/whatsapp', whatsappRoutes);

app.use('/api/google', googleAuthRoutes);

app.use('/api/google-places', googlePlacesRoutes);

app.use(notFound);

app.use(errorHandler);

export function isMainModule(moduleUrl, entryPath) {
  return Boolean(entryPath) && moduleUrl === pathToFileURL(entryPath).href;
}

export function installShutdown(server, reminderTimers) {
  let closing = false;

  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;

    logEvent('info', 'server.shutdown_started', { signal });

    const force = setTimeout(() => {
      logEvent('error', 'server.shutdown_forced');
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    force.unref();

    try {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeIdleConnections?.();
      });
      await stopReminderJob(reminderTimers);
      await mongoose.disconnect();
      logEvent('info', 'server.shutdown_complete');
      process.exit(0);
    } catch (error) {
      logEvent('error', 'server.shutdown_failed', { name: error.name, message: error.message });
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

export async function start() {
  const { errors, warnings } = validateEnv();

  for (const warning of warnings) {
    logEvent('warn', 'config.warning', { message: warning });
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logEvent('error', 'config.invalid', { message: error });
    }
    process.exit(1);
  }

  process.on('unhandledRejection', (reason) => {
    logEvent('error', 'process.unhandled_rejection', { name: reason?.name, message: reason?.message });
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logEvent('error', 'process.uncaught_exception', { name: error?.name, message: error?.message });
    process.exit(1);
  });

  try {
    await connectDB();

    const result = await runMigrations();

    if (result.migrated > 0) {
      logEvent('info', 'migration.completed', {
        migrated: result.migrated,
        patientLinkFailures: result.patientLinkFailures,
      });
    }
  } catch (error) {
    logEvent('error', 'startup.failed', { name: error.name, message: error.message });
    process.exit(1);
  }

  const reminderTimers = startReminderJob();

  const server = app.listen(PORT, () => {
    logEvent('info', 'server.listening', {
      port: PORT,
      environment: NODE_ENV,
      allowedOrigins: allowedOrigins.join(', '),
    });
  });

  installShutdown(server, reminderTimers);
}

if (isMainModule(import.meta.url, process.argv[1])) {
  start();
}

export default app;
