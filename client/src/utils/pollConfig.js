export function readIntervalMs(raw, { fallback, min }) {
  const text = String(raw ?? '').trim().toLowerCase();

  if (!text) return fallback;
  if (text === 'off' || text === '0') return 0;

  const value = Number(text);

  if (!Number.isFinite(value) || value < 0) return fallback;
  if (value === 0) return 0;

  return Math.max(Math.round(value), min);
}

export const FEEDBACK_POLL_DEFAULT_MS = 60000;
export const FEEDBACK_POLL_MIN_MS = 15000;
export const DASHBOARD_REFRESH_DEFAULT_MS = 30000;
export const DASHBOARD_REFRESH_MIN_MS = 15000;
export const SLOT_REFRESH_MS = 30000;
export const SLOT_RETRY_MS = 5000;
