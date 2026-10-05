export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
];

let cachedToken = null;

export function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google credentials are not fully configured.');
  }

  return { clientId, clientSecret, refreshToken };
}

export function clearGoogleTokenCache() {
  cachedToken = null;
}

export async function getGoogleAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const { clientId, clientSecret, refreshToken } = getGoogleCredentials();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || 'Unable to authenticate with Google.');
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max((Number(data.expires_in) || 3600) - 120, 60) * 1000,
  };

  return cachedToken.value;
}
