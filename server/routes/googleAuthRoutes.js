import { Router } from 'express';
import crypto from 'node:crypto';
import { GOOGLE_SCOPES } from '../services/googleAuth.js';

const router = Router();

const STATE_COOKIE = 'google_oauth_state';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth configuration is incomplete.');
  }

  return { clientId, clientSecret, redirectUri };
}

function requireSetupEnabled(req, res, next) {
  if (process.env.GOOGLE_OAUTH_SETUP_ENABLED !== 'true') {
    return res.status(404).json({ success: false, message: 'Route not found.' });
  }

  res.set('Cache-Control', 'no-store');
  return next();
}

router.use(requireSetupEnabled);

router.get('/authorize', (req, res, next) => {
  try {
    const { clientId, redirectUri } = getOAuthConfig();
    const state = crypto.randomBytes(32).toString('hex');

    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/api/google',
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES.join(' '),
      state,
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (error) {
    return next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  try {
    const { code, error, state } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];

    res.clearCookie(STATE_COOKIE, { path: '/api/google' });

    if (error) {
      return res.status(400).send(`Google authorization failed: ${escapeHtml(error)}`);
    }

    if (
      typeof state !== 'string' ||
      !expectedState ||
      state.length !== expectedState.length ||
      !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
    ) {
      return res.status(400).send('Invalid authorization state. Start the setup again.');
    }

    if (typeof code !== 'string' || !code) {
      return res.status(400).send('Missing Google authorization code.');
    }

    const { clientId, clientSecret, redirectUri } = getOAuthConfig();

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || !tokenData.refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Unable to obtain Google refresh token.',
        error: tokenData.error_description || tokenData.error,
      });
    }

    return res.status(200).send(`
      <h2>Google authorization successful.</h2>
      <p>Copy the refresh token and save it as GOOGLE_REFRESH_TOKEN in your server environment. Then set GOOGLE_OAUTH_SETUP_ENABLED back to false.</p>
      <textarea style="width:100%;height:120px;" readonly>${escapeHtml(tokenData.refresh_token)}</textarea>
    `);
  } catch (error) {
    return next(error);
  }
});

export default router;
