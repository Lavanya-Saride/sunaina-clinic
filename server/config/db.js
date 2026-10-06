import mongoose from 'mongoose';
import { recordProviderFailure, recordProviderSuccess } from '../utils/alerts.js';
import { logEvent } from '../utils/logger.js';

let listenersAttached = false;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (error) => {
    logEvent('error', 'database.error', { name: error.name, message: error.message });
    recordProviderFailure('database', { step: 'connection' });
  });

  mongoose.connection.on('disconnected', () => {
    logEvent('warn', 'database.disconnected');
    recordProviderFailure('database', { step: 'disconnected' });
  });

  mongoose.connection.on('reconnected', () => {
    logEvent('info', 'database.reconnected');
    recordProviderSuccess('database');
  });
}

export default async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set. Add it to your .env file.');
  }

  mongoose.set('strictQuery', true);
  attachListeners();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  logEvent('info', 'database.connected');
}
