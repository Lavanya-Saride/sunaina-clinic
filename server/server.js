import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import connectDB from './config/db.js';

import feedbackRoutes from './routes/feedbackRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';

import {
  notFound,
  errorHandler,
} from './middleware/errorHandler.js';

import { apiLimiter } from './middleware/rateLimiter.js';

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const allowedOrigins = (
  process.env.CLIENT_URL || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin
        .trim()
        .replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },

    methods: ['GET', 'POST', 'OPTIONS'],

    allowedHeaders: ['Content-Type'],

    optionsSuccessStatus: 204,
  })
);

app.use(
  express.json({
    limit: '10kb',
    strict: true,
  })
);

app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/appointment', appointmentRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();

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

start();

export default app;