import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELISM = 3;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 12;

function derive(password, salt, cost, blockSize, parallelism) {
  return scryptAsync(password, salt, KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: MAX_MEMORY,
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM);

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password, stored) {
  const [scheme, cost, blockSize, parallelism, saltValue, hashValue] = String(stored || '').split('$');

  if (scheme !== 'scrypt' || !hashValue) {
    return false;
  }

  const expected = Buffer.from(hashValue, 'base64');
  const actual = await derive(
    password,
    Buffer.from(saltValue, 'base64'),
    Number(cost),
    Number(blockSize),
    Number(parallelism)
  );

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include uppercase, lowercase and a number.';
  }

  return null;
}
