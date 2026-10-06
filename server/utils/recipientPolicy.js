import { normalizePhone } from './phone.js';

export const RECIPIENT_NOT_ALLOWED = 'RECIPIENT_NOT_ALLOWED';

function allowList() {
  return (process.env.OUTBOUND_ALLOWED_RECIPIENTS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isRecipientAllowed(value) {
  const list = allowList();

  if (list.length === 0) return true;

  const text = String(value || '').trim().toLowerCase();

  if (text.includes('@')) {
    return list.some((entry) => entry === text || (entry.startsWith('@') && text.endsWith(entry)));
  }

  const phone = normalizePhone(text);

  return Boolean(phone) && list.some((entry) => !entry.includes('@') && normalizePhone(entry) === phone);
}

export function assertRecipientAllowed(value) {
  if (isRecipientAllowed(value)) return;

  const error = new Error('Recipient is not on the outbound allow-list.');
  error.code = RECIPIENT_NOT_ALLOWED;
  throw error;
}
