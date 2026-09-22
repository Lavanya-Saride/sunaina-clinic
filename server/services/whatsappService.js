import { CLINIC_MAPS_URL, getSlotEndLabel } from '../config/appointmentConfig.js';

function getWhatsAppConfig() {
  const apiUrl = process.env.WHATSAPP_API_URL?.trim() || 'https://graph.facebook.com/v20.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const clinicNumber = process.env.WHATSAPP_CLINIC_NUMBER?.trim();

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials are not fully configured.');
  }

  return { apiUrl, phoneNumberId, accessToken, clinicNumber };
}

function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendWhatsAppTextMessage(to, body) {
  const { apiUrl, phoneNumberId, accessToken } = getWhatsAppConfig();
  const recipient = normalizeWhatsAppNumber(to);

  if (!recipient) {
    throw new Error('WhatsApp recipient number is missing.');
  }

  const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: {
        preview_url: true,
        body,
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'WhatsApp message could not be sent.');
    error.status = response.status;
    throw error;
  }

  return data;
}

function getConsultationLabel(appointment) {
  return appointment.consultationType === 'virtual' ? 'Virtual Consultation' : 'Clinic Consultation';
}

function buildAppointmentLines(appointment) {
  const endLabel = getSlotEndLabel(appointment.timeSlot);
  const lines = [
    `Appointment No: ${appointment.appointmentNumber}`,
    `Consultation: ${getConsultationLabel(appointment)}`,
    `Date: ${appointment.appointmentDate}`,
    `Time: ${appointment.timeSlot} - ${endLabel}`,
    `Payment: Received (Rs. ${appointment.fee})`,
  ];

  if (appointment.consultationType === 'virtual') {
    lines.push(appointment.meetUrl ? `Google Meet: ${appointment.meetUrl}` : 'Google Meet link will be shared shortly.');
  } else {
    lines.push(`Directions: ${CLINIC_MAPS_URL}`);
  }

  return lines;
}

export async function sendPatientAppointmentWhatsApp(appointment) {
  if (!appointment.phoneNumber) return null;

  const lines = [
    'Your appointment at Sunaina Clinic is confirmed.',
    ...buildAppointmentLines(appointment),
  ];

  return sendWhatsAppTextMessage(appointment.phoneNumber, lines.join('\n'));
}

export async function sendClinicAppointmentWhatsApp(appointment) {
  const { clinicNumber } = getWhatsAppConfig();
  if (!clinicNumber) return null;

  const lines = [
    'New paid appointment.',
    ...buildAppointmentLines(appointment),
    `Patient: ${appointment.fullName}`,
    `Phone: ${appointment.phoneNumber}`,
    `Email: ${appointment.email}`,
  ];

  return sendWhatsAppTextMessage(clinicNumber, lines.join('\n'));
}
