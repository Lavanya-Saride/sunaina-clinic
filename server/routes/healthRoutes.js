import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(200).json({
    success: true,
    status: 'ok',
    database: dbState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.set('Cache-Control', 'no-store');
  res.status(connected ? 200 : 503).json({
    success: connected,
    status: connected ? 'ready' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
