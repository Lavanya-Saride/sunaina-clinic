import { Resend } from 'resend';
import { CLINIC_MAPS_URL, getSlotEndLabel } from '../config/appointmentConfig.js';

let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function getEmailConfig() {
  const from = process.env.RESEND_FROM?.trim();
  const clinicEmail = process.env.CLINIC_EMAIL?.trim();

  if (!from) {
    throw new Error('RESEND_FROM is not configured.');
  }

  if (!clinicEmail) {
    throw new Error('CLINIC_EMAIL is not configured.');
  }

  return { from, clinicEmail };
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getAppointmentDetails(appointment) {
  const type = appointment.consultationType === 'virtual' ? 'Virtual Consultation' : 'Clinic Consultation';
  const endLabel = getSlotEndLabel(appointment.timeSlot);
  const isVirtual = appointment.consultationType === 'virtual';
  const meetLine = appointment.meetUrl
    ? `Join Google Meet: ${appointment.meetUrl}`
    : 'Your Google Meet link will be shared shortly.';
  const directionsLine = `Get Directions: ${CLINIC_MAPS_URL}`;

  return {
    type,
    isVirtual,
    endLabel,
    meetLine,
    directionsLine,
    subject: `Appointment Confirmed - ${appointment.appointmentDate} ${appointment.timeSlot}`,
  };
}

export async function sendAppointmentConfirmationToPatient(appointment, idempotencyKey) {
  const { from } = getEmailConfig();
  if (!appointment.email) return null;

  const resend = getResendClient();
  const { type, isVirtual, endLabel, meetLine, directionsLine, subject } = getAppointmentDetails(appointment);
  const name = escapeHtml(appointment.fullName);
  const date = escapeHtml(appointment.appointmentDate);
  const time = escapeHtml(appointment.timeSlot);
  const endTime = escapeHtml(endLabel);
  const appointmentNumber = escapeHtml(appointment.appointmentNumber);
  const fee = escapeHtml(appointment.fee);
  const sendOptions = idempotencyKey ? { idempotencyKey } : undefined;
  const payload = {
    from,
    to: [appointment.email],
    subject,
    text: `
Your appointment has been confirmed.

Doctor: Dr. Priyanka Singh
Consultation: ${type}
Date: ${appointment.appointmentDate}
Time: ${appointment.timeSlot} - ${endLabel}
Amount Paid: ₹${appointment.fee}
Appointment Number: ${appointment.appointmentNumber}

${isVirtual ? meetLine : directionsLine}
    `.trim(),
    html: `
      <h2>Appointment Confirmed</h2>
      <p>Your appointment has been confirmed.</p>
      <p>
        <strong>Doctor:</strong> Dr. Priyanka Singh<br />
        <strong>Consultation:</strong> ${type}<br />
        <strong>Date:</strong> ${date}<br />
        <strong>Time:</strong> ${time} - ${endTime}<br />
        <strong>Amount Paid:</strong> ₹${fee}<br />
        <strong>Appointment Number:</strong> ${appointmentNumber}
      </p>
      ${isVirtual
        ? (appointment.meetUrl ? `<p><strong>Google Meet:</strong> <a href="${appointment.meetUrl}">Join Consultation</a></p>` : '<p>Your Google Meet link will be shared shortly.</p>')
        : `<p><strong>Directions:</strong> <a href="${CLINIC_MAPS_URL}">Get Directions to Sunaina Clinic</a></p>`}
    `.trim(),
  };

  const { data, error } = await resend.emails.send(payload, sendOptions);
  if (error) throw new Error(error.message || 'Unable to send patient confirmation email.');
  if (!data?.id) throw new Error('Resend did not return an email ID.');
  return data;
}

export async function sendAppointmentConfirmationToClinic(appointment, idempotencyKey) {
  const { from, clinicEmail } = getEmailConfig();
  const resend = getResendClient();
  const { type, isVirtual, endLabel } = getAppointmentDetails(appointment);
  const name = escapeHtml(appointment.fullName);
  const phone = escapeHtml(appointment.phoneNumber);
  const email = escapeHtml(appointment.email);
  const appointmentNumber = escapeHtml(appointment.appointmentNumber);
  const date = escapeHtml(appointment.appointmentDate);
  const time = escapeHtml(appointment.timeSlot);
  const endTime = escapeHtml(endLabel);
  const fee = escapeHtml(appointment.fee);
  const paymentId = escapeHtml(appointment.paymentId);
  const sendOptions = idempotencyKey ? { idempotencyKey } : undefined;
  const payload = {
    from,
    to: [clinicEmail],
    subject: 'New Paid Appointment',
    text: `
A new paid appointment has been confirmed.

Appointment Number: ${appointment.appointmentNumber}
Patient: ${appointment.fullName}
Phone: ${appointment.phoneNumber}
Email: ${appointment.email}
Consultation: ${type}
Date: ${appointment.appointmentDate}
Time: ${appointment.timeSlot} - ${endLabel}
Amount Paid: ₹${appointment.fee}
Payment ID: ${appointment.paymentId}
Payment Status: PAID
${isVirtual ? `Google Meet: ${appointment.meetUrl || 'Not available'}` : `Directions: ${CLINIC_MAPS_URL}`}
    `.trim(),
    html: `
      <h2>New Paid Appointment</h2>
      <p>A new paid appointment has been confirmed.</p>
      <p>
        <strong>Appointment Number:</strong> ${appointmentNumber}<br />
        <strong>Patient:</strong> ${name}<br />
        <strong>Phone:</strong> ${phone}<br />
        <strong>Email:</strong> ${email}<br />
        <strong>Consultation:</strong> ${type}<br />
        <strong>Date:</strong> ${date}<br />
        <strong>Time:</strong> ${time} - ${endTime}<br />
        <strong>Amount Paid:</strong> ₹${fee}<br />
        <strong>Payment ID:</strong> ${paymentId}<br />
        <strong>Payment Status:</strong> PAID<br />
        ${isVirtual
          ? `<strong>Google Meet:</strong> ${appointment.meetUrl ? `<a href="${appointment.meetUrl}">Join Consultation</a>` : 'Not available'}`
          : `<strong>Directions:</strong> <a href="${CLINIC_MAPS_URL}">Get Directions to Sunaina Clinic</a>`}
      </p>
    `.trim(),
  };

  const { data, error } = await resend.emails.send(payload, sendOptions);
  if (error) throw new Error(error.message || 'Unable to send clinic confirmation email.');
  if (!data?.id) throw new Error('Resend did not return an email ID.');
  return data;
}

export async function sendCallbackRequest({ name, phone, idempotencyKey }) {
  const { from, clinicEmail } = getEmailConfig();
  const resend = getResendClient();
  const payload = {
    from,
    to: [clinicEmail],
    subject: 'Patient Callback Request',
    text: `A patient has requested a callback.\n\nName: ${name}\nPhone: ${phone}`,
    html: `<h2>Patient Callback Request</h2><p>A patient has requested a callback.</p><p><strong>Name:</strong> ${name}<br /><strong>Phone:</strong> ${phone}</p>`,
  };
  const sendOptions = idempotencyKey ? { idempotencyKey } : undefined;
  const { data, error } = await resend.emails.send(payload, sendOptions);
  if (error) throw new Error(error.message || 'Unable to send callback email.');
  if (!data?.id) throw new Error('Resend did not return an email ID.');
  return data;
}
