import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

export async function sendCallbackRequest({ name, phone }) {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.error('SMTP configuration is incomplete.');
    return false;
  }

  if (!process.env.SMTP_FROM || !process.env.CLINIC_EMAIL) {
    console.error(
      'SMTP_FROM or CLINIC_EMAIL is not configured.'
    );

    return false;
  }

  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.CLINIC_EMAIL,
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
    });

    return true;
  } catch (error) {
    console.error('CALLBACK EMAIL ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    return false;
  }
}