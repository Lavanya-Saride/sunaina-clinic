const POSITIVE_NUMBER_VARS = [
  'SESSION_TTL_HOURS',
  'SESSION_IDLE_MINUTES',
  'PAYMENT_HOLD_HOURS',
  'CLINIC_CONSULTATION_FEE',
  'VIRTUAL_CONSULTATION_FEE',
];

const LAST_EXPIRED_GRAPH_MAJOR = 20;

export function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const has = (name) => Boolean(env[name]?.trim());
  const countSet = (names) => names.filter(has).length;
  const production = env.NODE_ENV === 'production';

  if (!has('MONGO_URI')) {
    errors.push('MONGO_URI is not set.');
  }

  if (!has('NODE_ENV')) {
    warnings.push('NODE_ENV is not set. Set it to production on hosted deployments.');
  }

  if (production && !has('CLIENT_URL')) {
    warnings.push('CLIENT_URL is not set. Only the built-in origins are allowed by CORS.');
  }

  if (production && env.GOOGLE_OAUTH_SETUP_ENABLED === 'true') {
    warnings.push('GOOGLE_OAUTH_SETUP_ENABLED is ignored in production. Generate the refresh token on a local server.');
  }

  for (const name of POSITIVE_NUMBER_VARS) {
    if (has(name) && !(Number(env[name]) > 0)) {
      warnings.push(`${name} is not a positive number. The default is used.`);
    }
  }

  const google = countSet(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']);

  if (google === 0) {
    warnings.push('Google credentials are not set. Calendar, Meet and email steps will be marked failed.');
  } else if (google < 3) {
    warnings.push('Google credentials are only partly set. Calendar, Meet and email steps will be marked failed.');
  }

  const whatsapp = countSet(['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN']);

  if (whatsapp === 0) {
    warnings.push('WhatsApp credentials are not set. WhatsApp steps will be marked failed for opted-in patients.');
  } else if (whatsapp === 1) {
    warnings.push('WhatsApp credentials are only partly set. WhatsApp steps will be marked failed.');
  } else {
    if (!has('WHATSAPP_APP_SECRET')) {
      warnings.push('WHATSAPP_APP_SECRET is not set. Webhook signatures cannot be verified, so STOP replies are rejected.');
    }
    if (!has('WHATSAPP_VERIFY_TOKEN')) {
      warnings.push('WHATSAPP_VERIFY_TOKEN is not set. The webhook handshake with Meta will fail.');
    }
  }

  if (production && has('OUTBOUND_ALLOWED_RECIPIENTS')) {
    warnings.push('OUTBOUND_ALLOWED_RECIPIENTS is set in production. Patient messages to other recipients will be skipped.');
  }

  const graphMajor = Number(/^v(\d+)\.\d+$/.exec(env.WHATSAPP_API_VERSION?.trim() || '')?.[1]);

  if (graphMajor && graphMajor <= LAST_EXPIRED_GRAPH_MAJOR) {
    warnings.push('WHATSAPP_API_VERSION is a Graph API version that Meta has retired. Meta silently upgrades such calls. Set a supported version.');
  }

  if (countSet(['GOOGLE_PLACES_API_KEY', 'GOOGLE_PLACE_ID']) < 2) {
    warnings.push('GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID is not set. Google reviews will not load.');
  }

  const domain = (env.COMPANY_EMAIL_DOMAIN?.trim() || 'sunaina-clinic.com').toLowerCase();

  for (const name of ['EMAIL_APPOINTMENTS', 'EMAIL_SUPPORT']) {
    if (has(name) && !env[name].trim().toLowerCase().endsWith(`@${domain}`)) {
      warnings.push(`${name} must be an address on the company email domain. Sending will be refused.`);
    }
  }

  return { errors, warnings };
}
