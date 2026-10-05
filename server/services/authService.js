import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const TOUCH_INTERVAL_MS = 60 * 1000;

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function getSessionTtlMs() {
  return (Number(process.env.SESSION_TTL_HOURS) || 8) * 60 * 60 * 1000;
}

function getIdleTimeoutMs() {
  return (Number(process.env.SESSION_IDLE_MINUTES) || 60) * 60 * 1000;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

let dummyHashPromise = null;

function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('invalid-password-placeholder');
  }
  return dummyHashPromise;
}

export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function login(email, password) {
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
  const now = new Date();

  if (!user || !user.active) {
    await verifyPassword(password, await getDummyHash());
    throw new AuthError('Invalid email or password.');
  }

  if (user.lockUntil && user.lockUntil > now) {
    throw new AuthError('Too many failed attempts. Please try again later.', 429);
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update = { failedLoginAttempts: attempts };

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      update.lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
      update.failedLoginAttempts = 0;
    }

    await User.updateOne({ _id: user._id }, { $set: update });
    throw new AuthError('Invalid email or password.');
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockUntil: null, lastLoginAt: now } }
  );

  await Session.deleteMany({ expiresAt: { $lt: now } });

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + getSessionTtlMs());

  await Session.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt,
    lastActiveAt: now,
  });

  return { token, expiresAt, user: toPublicUser(user) };
}

export async function verifySession(token) {
  if (!token || typeof token !== 'string' || token.length > 200) {
    return null;
  }

  const now = new Date();
  const session = await Session.findOne({ tokenHash: hashToken(token) });

  if (!session) {
    return null;
  }

  const idleExpired = now.getTime() - session.lastActiveAt.getTime() > getIdleTimeoutMs();

  if (session.expiresAt <= now || idleExpired) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  const user = await User.findById(session.userId);

  if (!user || !user.active) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  if (now.getTime() - session.lastActiveAt.getTime() > TOUCH_INTERVAL_MS) {
    await Session.updateOne({ _id: session._id }, { $set: { lastActiveAt: now } });
  }

  return { user: toPublicUser(user), sessionId: session._id.toString(), expiresAt: session.expiresAt };
}

export async function logout(token) {
  if (!token) return;
  await Session.deleteOne({ tokenHash: hashToken(token) });
}

export async function revokeUserSessions(userId) {
  await Session.deleteMany({ userId });
}
