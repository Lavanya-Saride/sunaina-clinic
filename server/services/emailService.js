import { randomBytes } from 'node:crypto';
import { CLINIC_MAPS_URL, CLINIC_TIME_ZONE_LABEL, getSlotRangeLabel } from '../config/appointmentConfig.js';
import { getGoogleAccessToken } from './googleAuth.js';
import { formatDisplayDate } from '../utils/appointmentTime.js';
import { providerFetch } from '../utils/providerFetch.js';
import { assertRecipientAllowed } from '../utils/recipientPolicy.js';

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const CLINIC_NAME = 'Sunaina Clinic';

const MAILBOX_DEFAULTS = {
  appointments: ['EMAIL_APPOINTMENTS', 'appointments@sunaina-clinic.com'],
  support: ['EMAIL_SUPPORT', 'support@sunaina-clinic.com'],
};

export function getCompanyDomain() {
  return (process.env.COMPANY_EMAIL_DOMAIN?.trim() || 'sunaina-clinic.com').toLowerCase();
}

export function getSenderMailbox() {
  const address = process.env.EMAIL_APPOINTMENTS?.trim().toLowerCase();

  if (!address) {
    throw new Error('EMAIL_APPOINTMENTS is not configured.');
  }

  if (!address.endsWith(`@${getCompanyDomain()}`)) {
    throw new Error(`EMAIL_APPOINTMENTS must be a ${getCompanyDomain()} address.`);
  }

  return address;
}

export function getMailbox(name) {
  const [envKey, fallback] = MAILBOX_DEFAULTS[name];
  const address = (process.env[envKey]?.trim() || process.env.EMAIL_APPOINTMENTS?.trim() || fallback).toLowerCase();

  if (!address.endsWith(`@${getCompanyDomain()}`)) {
    throw new Error(`${envKey} must be a ${getCompanyDomain()} address.`);
  }

  return address;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripLineBreaks(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(stripLineBreaks(value), 'utf8').toString('base64')}?=`;
}

function encodeBody(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');
}

function assertRecipient(address) {
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(address)) {
    throw new Error('Recipient email address is invalid.');
  }
}

export function buildMimeMessage({ from, to, subject, text, html }) {
  assertRecipient(to);
  const boundary = `sc_${randomBytes(12).toString('hex')}`;

  return [
    `From: ${encodeHeader(CLINIC_NAME)} <${from}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBody(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBody(html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export async function sendMail({ from, to, subject, text, html }) {
  if (!String(to).toLowerCase().endsWith(`@${getCompanyDomain()}`)) {
    assertRecipientAllowed(to);
  }

  const accessToken = await getGoogleAccessToken();
  const raw = Buffer.from(buildMimeMessage({ from, to, subject, text, html }), 'utf8').toString('base64url');

  const response = await providerFetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Unable to send email.');
    error.status = response.status;
    throw error;
  }

  if (!data?.id) {
    throw new Error('Gmail did not return a message ID.');
  }

  return data;
}

function getDetails(appointment) {
  const isVirtual = appointment.consultationType === 'virtual';

  return {
    isVirtual,
    type: isVirtual ? 'Virtual Consultation' : 'Clinic Consultation',
    date: formatDisplayDate(appointment.appointmentDate),
    timeRange: getSlotRangeLabel(appointment.timeSlot),
    amount: appointment.paymentAmount ?? appointment.fee,
  };
}

function buildLocationLine(appointment, isVirtual) {
  if (isVirtual) {
    return appointment.meetUrl
      ? { text: `Join Google Meet: ${appointment.meetUrl}`, html: `<p><strong>Google Meet:</strong> <a href="${escapeHtml(appointment.meetUrl)}">Join Consultation</a></p>` }
      : { text: 'Your Google Meet link will be shared shortly.', html: '<p>Your Google Meet link will be shared shortly.</p>' };
  }

  return {
    text: `Get Directions: ${CLINIC_MAPS_URL}`,
    html: `<p><strong>Directions:</strong> <a href="${escapeHtml(CLINIC_MAPS_URL)}">Get Directions to Sunaina Clinic</a></p>`,
  };
}

function subjectWhen(appointment) {
  return `${formatDisplayDate(appointment.appointmentDate)}, ${appointment.timeSlot} ${CLINIC_TIME_ZONE_LABEL}`;
}

function buildPatientMessage(appointment, { heading, intro, showPayment }) {
  const { isVirtual, type, date, timeRange, amount } = getDetails(appointment);
  const location = buildLocationLine(appointment, isVirtual);
  const paymentText = showPayment ? `\nAmount Paid: ₹${amount}` : '';
  const paymentHtml = showPayment ? `<strong>Amount Paid:</strong> ₹${escapeHtml(amount)}<br />` : '';

  return {
    text: `
${intro}

Doctor: Dr. Priyanka Singh
Consultation: ${type}
Date: ${date}
Time: ${timeRange}${paymentText}
Appointment Number: ${appointment.appointmentNumber}

${location.text}
    `.trim(),
    html: `
      <h2>${escapeHtml(heading)}</h2>
      <p>${escapeHtml(intro)}</p>
      <p>
        <strong>Doctor:</strong> Dr. Priyanka Singh<br />
        <strong>Consultation:</strong> ${type}<br />
        <strong>Date:</strong> ${escapeHtml(date)}<br />
        <strong>Time:</strong> ${escapeHtml(timeRange)}<br />
        ${paymentHtml}
        <strong>Appointment Number:</strong> ${escapeHtml(appointment.appointmentNumber)}
      </p>
      ${location.html}
    `.trim(),
  };
}

export async function sendAppointmentConfirmationToPatient(appointment) {
  if (!appointment.email) return null;

  const content = buildPatientMessage(appointment, {
    heading: 'Appointment Confirmed',
    intro: 'Your appointment has been confirmed.',
    showPayment: true,
  });

  return sendMail({
    from: getSenderMailbox(),
    to: appointment.email,
    subject: `Appointment Confirmed - ${subjectWhen(appointment)}`,
    ...content,
  });
}

export async function sendAppointmentReminderToPatient(appointment) {
  if (!appointment.email) return null;

  const content = buildPatientMessage(appointment, {
    heading: 'Appointment Reminder',
    intro: 'This is a reminder for your upcoming appointment at Sunaina Clinic.',
    showPayment: false,
  });

  return sendMail({
    from: getSenderMailbox(),
    to: appointment.email,
    subject: `Appointment Reminder - ${subjectWhen(appointment)}`,
    ...content,
  });
}

export async function sendFeedbackRequestToPatient(appointment, feedbackUrl) {
  if (!appointment.email) return null;

  const name = appointment.fullName;

  return sendMail({
    from: getSenderMailbox(),
    to: appointment.email,
    subject: 'How was your visit to Sunaina Clinic?',
    text: `
Dear ${name},

Thank you for visiting Sunaina Clinic. We would be grateful if you could share your experience with us.

Share your feedback: ${feedbackUrl}
    `.trim(),
    html: `
      <h2>Thank you for visiting Sunaina Clinic</h2>
      <p>Dear ${escapeHtml(name)},</p>
      <p>We would be grateful if you could share your experience with us.</p>
      <p><a href="${escapeHtml(feedbackUrl)}">Share your feedback</a></p>
    `.trim(),
  });
}

export async function sendAppointmentConfirmationToClinic(appointment) {
  const { isVirtual, type, date, timeRange, amount } = getDetails(appointment);
  const method = appointment.paymentMethod || 'N/A';
  const reference = appointment.paymentReference || 'N/A';
  const meetValue = appointment.meetUrl || 'Not available';
  const locationText = isVirtual ? `Google Meet: ${meetValue}` : `Directions: ${CLINIC_MAPS_URL}`;
  const locationHtml = isVirtual
    ? `<strong>Google Meet:</strong> ${appointment.meetUrl ? `<a href="${escapeHtml(appointment.meetUrl)}">Join Consultation</a>` : 'Not available'}`
    : `<strong>Directions:</strong> <a href="${escapeHtml(CLINIC_MAPS_URL)}">Get Directions to Sunaina Clinic</a>`;

  return sendMail({
    from: getSenderMailbox(),
    to: getMailbox('appointments'),
    subject: 'New Confirmed Appointment',
    text: `
A new appointment has been confirmed.

Appointment Number: ${appointment.appointmentNumber}
Patient: ${appointment.fullName}
Phone: ${appointment.phoneNumber}
Email: ${appointment.email || 'N/A'}
Consultation: ${type}
Date: ${date}
Time: ${timeRange}
Amount Paid: ₹${amount}
Payment Method: ${method}
Payment Reference: ${reference}
${locationText}
    `.trim(),
    html: `
      <h2>New Confirmed Appointment</h2>
      <p>A new appointment has been confirmed.</p>
      <p>
        <strong>Appointment Number:</strong> ${escapeHtml(appointment.appointmentNumber)}<br />
        <strong>Patient:</strong> ${escapeHtml(appointment.fullName)}<br />
        <strong>Phone:</strong> ${escapeHtml(appointment.phoneNumber)}<br />
        <strong>Email:</strong> ${escapeHtml(appointment.email || 'N/A')}<br />
        <strong>Consultation:</strong> ${type}<br />
        <strong>Date:</strong> ${escapeHtml(date)}<br />
        <strong>Time:</strong> ${escapeHtml(timeRange)}<br />
        <strong>Amount Paid:</strong> ₹${escapeHtml(amount)}<br />
        <strong>Payment Method:</strong> ${escapeHtml(method)}<br />
        <strong>Payment Reference:</strong> ${escapeHtml(reference)}<br />
        ${locationHtml}
      </p>
    `.trim(),
  });
}

export async function sendCallbackRequest({ name, phone }) {
  return sendMail({
    from: getSenderMailbox(),
    to: getMailbox('support'),
    subject: 'Patient Callback Request',
    text: `A patient has requested a callback.\n\nName: ${name}\nPhone: ${phone}`,
    html: `<h2>Patient Callback Request</h2><p>A patient has requested a callback.</p><p><strong>Name:</strong> ${escapeHtml(name)}<br /><strong>Phone:</strong> ${escapeHtml(phone)}</p>`,
  });
}
