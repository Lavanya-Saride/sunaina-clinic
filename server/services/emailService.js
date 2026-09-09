import { Resend } from 'resend';

let resendClient = null;

function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  resendClient = new Resend(apiKey);

  return resendClient;
}

export async function sendCallbackRequest({ name, phone, idempotencyKey }) {
  const from = process.env.RESEND_FROM?.trim();
  const to = process.env.CLINIC_EMAIL?.trim();

  if (!from) {
    throw new Error('RESEND_FROM is not configured.');
  }

  if (!to) {
    throw new Error('CLINIC_EMAIL is not configured.');
  }

  const resend = getResendClient();

  const payload = {
    from,
    to: [to],
    subject: 'After-Hours Callback Request - Sunaina Clinic',
    text: `
A patient has requested a callback.

Name: ${name}
Phone: ${phone}

Please contact the patient during clinic hours.

This request was submitted through the Sunaina Clinic website.
    `.trim(),
    html: `
      <h2>After-Hours Callback Request</h2>

      <p>A patient has requested a callback.</p>

      <p>
        <strong>Name:</strong> ${name}<br />
        <strong>Phone:</strong> ${phone}
      </p>

      <p>
        Please contact the patient during clinic hours.
      </p>

      <p>
        This request was submitted through the Sunaina Clinic website.
      </p>
    `,
  };

  // Passing the callback's own MongoDB id as the Resend idempotency key
  // means retried/duplicate calls for the same callback (e.g. a client
  // retry, or a future queue/worker retry) will not result in a second
  // email being sent for the same request.
  const sendOptions = idempotencyKey ? { idempotencyKey } : undefined;

  try {
    const { data, error } = await resend.emails.send(payload, sendOptions);

    if (error) {
      console.error('CALLBACK EMAIL ERROR:', error);
      throw new Error(
        error.message || 'Unable to send callback email.'
      );
    }

    if (!data?.id) {
      throw new Error('Resend did not return an email ID.');
    }

    console.log('CALLBACK EMAIL SENT:', data.id);

    return data;
  } catch (error) {
    console.error('CALLBACK EMAIL ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
    });

    throw error;
  }
}
