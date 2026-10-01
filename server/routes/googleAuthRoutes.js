import { Router } from 'express';
import crypto from 'node:crypto';

const router = Router();

function getGoogleConfig() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim();

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim();

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    throw new Error(
      'Google OAuth configuration is incomplete.'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

router.get(
  '/authorize',
  (req, res, next) => {
    try {
      const {
        clientId,
        redirectUri,
      } = getGoogleConfig();

      const state =
        crypto.randomBytes(32).toString('hex');

      const params =
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          access_type: 'offline',
          prompt: 'consent',
          scope:
            'https://www.googleapis.com/auth/calendar.events',
          state,
        });

      return res.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      );
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/callback',
  async (req, res, next) => {
    try {
      const {
        code,
        error,
      } = req.query;

      if (error) {
        return res
          .status(400)
          .send(
            `Google authorization failed: ${error}`
          );
      }

      if (!code) {
        return res
          .status(400)
          .send(
            'Missing Google authorization code.'
          );
      }

      const {
        clientId,
        clientSecret,
        redirectUri,
      } = getGoogleConfig();

      const tokenResponse =
        await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded',
            },
            body:
              new URLSearchParams({
                client_id: clientId,
                client_secret:
                  clientSecret,
                code,
                grant_type:
                  'authorization_code',
                redirect_uri:
                  redirectUri,
              }),
          }
        );

      const tokenData =
        await tokenResponse
          .json();

      if (
        !tokenResponse.ok ||
        !tokenData.refresh_token
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Unable to obtain Google refresh token.',
            error:
              tokenData.error_description ||
              tokenData.error,
          });
      }

      return res
        .status(200)
        .send(`
          <h2>Google Calendar authorization successful.</h2>
          <p>
            Copy the refresh token and add it to
            Render as GOOGLE_REFRESH_TOKEN.
          </p>

          <textarea
            style="width:100%;height:120px;"
          >${tokenData.refresh_token}</textarea>

          <p>
            You can close this page after saving
            the token in Render.
          </p>
        `);
    } catch (error) {
      next(error);
    }
  }
);

export default router;