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

export default router;
