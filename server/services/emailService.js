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

export async function sendCallbackRequest({
  name,
  phone,
  idempotencyKey,
}) {
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
    subject: 'Patient Callback Request',
    text: `
A patient has requested a callback.

Name: ${name}
Phone: ${phone}
    `.trim(),
    html: `
      <h2>Patient Callback Request</h2>

      <p>A patient has requested a callback.</p>

      <p>
        <strong>Name:</strong> ${name}<br />
        <strong>Phone:</strong> ${phone}
      </p>
    `,
  };

  const sendOptions = idempotencyKey
    ? { idempotencyKey }
    : undefined;

  try {
    const { data, error } =
      await resend.emails.send(
        payload,
        sendOptions
      );

    if (error) {
      console.error(
        'CALLBACK EMAIL ERROR:',
        error
      );

      throw new Error(
        error.message ||
          'Unable to send callback email.'
      );
    }

    if (!data?.id) {
      throw new Error(
        'Resend did not return an email ID.'
      );
    }

    console.log(
      'CALLBACK EMAIL SENT:',
      data.id
    );

    return data;
  } catch (error) {
    console.error(
      'CALLBACK EMAIL ERROR:',
      {
        message: error.message,
        name: error.name,
        code: error.code,
        statusCode: error.statusCode,
      }
    );

    throw error;
  }
}