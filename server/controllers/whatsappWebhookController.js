import { createHmac, timingSafeEqual } from 'node:crypto';
import Patient from '../models/Patient.js';
import { normalizePhone } from '../utils/phone.js';

const OPT_OUT_KEYWORDS = ['STOP', 'STOP ALL', 'UNSUBSCRIBE'];

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyWebhook(req, res) {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (expected && mode === 'subscribe' && typeof token === 'string' && safeEqual(token, expected)) {
    return res.status(200).type('text/plain').send(String(challenge ?? ''));
  }

  return res.status(403).json({ success: false, message: 'Verification failed.' });
}

export function isValidSignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();

  if (!secret || !rawBody || !signatureHeader) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(signatureHeader, expected);
}

export async function receiveWebhook(req, res, next) {
  try {
    if (!isValidSignature(req.rawBody, req.get('X-Hub-Signature-256'))) {
      return res.status(403).json({ success: false, message: 'Invalid signature.' });
    }

    const accountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

    for (const entry of entries) {
      if (accountId && entry?.id !== accountId) continue;

      for (const change of entry?.changes || []) {
        for (const message of change?.value?.messages || []) {
          const text = String(message?.text?.body || '').trim().toUpperCase();

          if (message?.type === 'text' && OPT_OUT_KEYWORDS.includes(text) && message.from) {
            await Patient.updateOne(
              { whatsappNumber: normalizePhone(message.from) },
              { $set: { whatsappOptIn: false, whatsappOptOutAt: new Date() } }
            );
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}
