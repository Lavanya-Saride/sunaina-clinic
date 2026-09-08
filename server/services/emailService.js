import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendCallbackRequest({ name, phone }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.CLINIC_EMAIL,
    subject: 'After-Hours Callback Request - Sunaina Clinic',

    text: `
A patient has requested a callback outside clinic hours.

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
}