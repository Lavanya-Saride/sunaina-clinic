import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../config/validateEnv.js';

const base = { MONGO_URI: 'mongodb://example.invalid/clinic', NODE_ENV: 'production', CLIENT_URL: 'https://site.example' };

describe('startup configuration validation', () => {
  test('a missing MONGO_URI is the only hard error', () => {
    assert.deepEqual(validateEnv({}).errors, ['MONGO_URI is not set.']);
    assert.deepEqual(validateEnv(base).errors, []);
  });

  test('optional integrations produce warnings, not errors', () => {
    const { errors, warnings } = validateEnv(base);
    assert.equal(errors.length, 0);
    assert.ok(warnings.some((w) => /Google credentials are not set/.test(w)));
    assert.ok(warnings.some((w) => /WhatsApp credentials are not set/.test(w)));
    assert.ok(warnings.some((w) => /GOOGLE_PLACES_API_KEY/.test(w)));
  });

  test('partial credentials are flagged and a complete WhatsApp setup requires signature secrets', () => {
    const partial = validateEnv({ ...base, GOOGLE_CLIENT_ID: 'x', WHATSAPP_PHONE_NUMBER_ID: '1' });
    assert.ok(partial.warnings.some((w) => /only partly set/.test(w) && /Google/.test(w)));
    assert.ok(partial.warnings.some((w) => /only partly set/.test(w) && /WhatsApp/.test(w)));

    const full = validateEnv({ ...base, WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_ACCESS_TOKEN: 't' });
    assert.ok(full.warnings.some((w) => /WHATSAPP_APP_SECRET/.test(w)));
    assert.ok(full.warnings.some((w) => /WHATSAPP_VERIFY_TOKEN/.test(w)));
  });

  test('sender addresses outside the company domain are flagged', () => {
    const result = validateEnv({ ...base, COMPANY_EMAIL_DOMAIN: 'clinic.example', EMAIL_SUPPORT: 'help@other.example' });
    assert.ok(result.warnings.some((w) => /EMAIL_SUPPORT/.test(w)));
  });

  test('a retired Graph API version is flagged, a current or unset one is not', () => {
    assert.ok(validateEnv({ ...base, WHATSAPP_API_VERSION: 'v20.0' }).warnings.some((w) => /retired/.test(w)));
    assert.ok(validateEnv({ ...base, WHATSAPP_API_VERSION: 'v19.0' }).warnings.some((w) => /retired/.test(w)));
    assert.equal(validateEnv({ ...base, WHATSAPP_API_VERSION: 'v25.0' }).warnings.some((w) => /retired/.test(w)), false);
    assert.equal(validateEnv(base).warnings.some((w) => /retired/.test(w)), false);
  });

  test('non-numeric tunables are flagged', () => {
    assert.ok(validateEnv({ ...base, PAYMENT_HOLD_HOURS: 'abc' }).warnings.some((w) => /PAYMENT_HOLD_HOURS/.test(w)));
    assert.ok(validateEnv({ ...base, SESSION_TTL_HOURS: '0' }).warnings.some((w) => /SESSION_TTL_HOURS/.test(w)));
  });

  test('the OAuth setup flag is called out in production', () => {
    assert.ok(validateEnv({ ...base, GOOGLE_OAUTH_SETUP_ENABLED: 'true' }).warnings.some((w) => /ignored in production/.test(w)));
  });

  test('secret values never appear in any message', () => {
    const secrets = {
      MONGO_URI: 'mongodb://user:supersecretpass@host/db',
      GOOGLE_CLIENT_SECRET: 'gsecret-value-123',
      GOOGLE_REFRESH_TOKEN: 'refresh-value-456',
      WHATSAPP_ACCESS_TOKEN: 'wa-token-789',
      WHATSAPP_APP_SECRET: 'appsecret-000',
      NODE_ENV: 'production',
      EMAIL_APPOINTMENTS: 'a@wrong.example',
    };
    const { errors, warnings } = validateEnv(secrets);
    const output = [...errors, ...warnings].join('\n');
    for (const value of Object.values(secrets)) {
      if (value.includes('@') || value === 'production') continue;
      assert.equal(output.includes(value), false, value);
    }
  });
});
