import { logEvent } from './logger.js';

export const ALERT_FAILURE_THRESHOLD = 3;
export const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

const providers = new Map();

function entryFor(provider) {
  if (!providers.has(provider)) {
    providers.set(provider, { failures: 0, lastAlertAt: null });
  }
  return providers.get(provider);
}

export function recordProviderSuccess(provider) {
  entryFor(provider).failures = 0;
}

export function recordProviderFailure(provider, details = {}, now = Date.now()) {
  const entry = entryFor(provider);
  entry.failures += 1;

  const coolingDown = entry.lastAlertAt !== null && now - entry.lastAlertAt < ALERT_COOLDOWN_MS;

  if (entry.failures < ALERT_FAILURE_THRESHOLD || coolingDown) {
    return false;
  }

  entry.lastAlertAt = now;
  logEvent('alert', 'integration.repeated_failure', {
    provider,
    consecutiveFailures: entry.failures,
    ...details,
  });
  return true;
}

export function resetAlertState() {
  providers.clear();
}
