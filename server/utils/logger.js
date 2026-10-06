const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const NUMBER_PATTERN = /\+?\d[\d\s-]{8,}\d/g;
const MAX_MESSAGE_LENGTH = 200;
const MAX_FIELD_LENGTH = 120;

export function sanitizeLogText(value) {
  return String(value ?? '')
    .replace(EMAIL_PATTERN, '[email]')
    .replace(NUMBER_PATTERN, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function sinkFor(level) {
  if (level === 'error' || level === 'alert') return console.error;
  if (level === 'warn') return console.warn;
  return console.log;
}

export function logEvent(level, event, fields = {}) {
  const entry = { time: new Date().toISOString(), level, event };

  for (const [key, value] of Object.entries(fields)) {
    if (key === 'message') {
      entry.message = sanitizeLogText(value);
    } else if (typeof value === 'string') {
      entry[key] = value.slice(0, MAX_FIELD_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      entry[key] = value;
    }
  }

  sinkFor(level)(JSON.stringify(entry));
}
