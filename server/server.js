import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { runMigrations } from './config/migrations.js';
import { startReminderJob } from './jobs/reminderJob.js';

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

import { apiLimiter } from './middleware/rateLimiter.js';

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

async function start() {
  try {
    await connectDB();

    try {
      const result = await runMigrations();
      if (result.migrated > 0) {
        console.log(`Data migration completed for ${result.migrated} appointment(s).`);
      }
    } catch (migrationError) {
      console.error('Data migration failed:', migrationError.message);
    }

    startReminderJob();

    app.listen(PORT, () => {
      console.log(
        `Sunaina Clinic API running on port ${PORT} [${NODE_ENV}]`
      );

      console.log(
        `Allowed CORS origins: ${allowedOrigins.join(', ')}`
      );
    });
  } catch (error) {
    console.error(
      'Failed to start server:',
      error.message
    );

    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
