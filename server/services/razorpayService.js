import crypto from 'node:crypto';

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!keyId || !keySecret || !webhookSecret) {
    throw new Error('Razorpay credentials are not fully configured.');
  }

  return { keyId, keySecret, webhookSecret };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left || '', 'utf8');
  const rightBuffer = Buffer.from(right || '', 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getAuthHeader(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function razorpayRequest(path, options = {}) {
  const { keyId, keySecret } = getCredentials();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(keyId, keySecret),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.description || 'Razorpay request failed.');
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

export function getRazorpayKeyId() {
  const { keyId } = getCredentials();
  return keyId;
}

export async function createRazorpayOrder({ amount, receipt }) {
  return razorpayRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      payment_capture: 1,
    }),
  });
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = getCredentials();
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  const { webhookSecret } = getCredentials();
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return safeEqual(expected, signature);
}


export async function fetchRazorpayOrder(orderId) {
  return razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);
}

export async function fetchRazorpayPayment(paymentId) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}
