import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import connectDB from './config/db.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: false,
  })
);
app.use(express.json({ limit: '10kb' }));
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
      console.log(`Sunaina Clinic API running on port ${PORT} [${NODE_ENV}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

export default app;
