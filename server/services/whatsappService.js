import { CLINIC_MAPS_URL, getSlotRangeLabel } from '../config/appointmentConfig.js';
import { formatDisplayDate } from '../utils/appointmentTime.js';
import { normalizePhone } from '../utils/phone.js';
import { providerFetch } from '../utils/providerFetch.js';
import { assertRecipientAllowed } from '../utils/recipientPolicy.js';

const TEMPLATE_DEFAULTS = {
  confirmation: ['WHATSAPP_TEMPLATE_CONFIRMATION', 'appointment_confirmation'],
  reminder: ['WHATSAPP_TEMPLATE_REMINDER', 'appointment_reminder'],
  feedback: ['WHATSAPP_TEMPLATE_FEEDBACK', 'feedback_request'],
  clinicAlert: ['WHATSAPP_TEMPLATE_CLINIC_ALERT', 'clinic_new_appointment'],
};

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() && process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  );
}

function getWhatsAppConfig() {
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v25.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const clinicNumber = process.env.WHATSAPP_CLINIC_NUMBER?.trim();
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en';

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials are not fully configured.');
  }

  return { apiVersion, phoneNumberId, accessToken, clinicNumber, language };
}

function getTemplateName(key) {
  const [envKey, fallback] = TEMPLATE_DEFAULTS[key];
  return process.env[envKey]?.trim() || fallback;
}

function cleanParameter(value) {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  return text || '-';
}

async function sendTemplateMessage(to, templateKey, parameters, { internal = false } = {}) {
  const { apiVersion, phoneNumberId, accessToken, language } = getWhatsAppConfig();
  const recipient = normalizePhone(to);

  if (!internal) {
    assertRecipientAllowed(recipient);
  }

  if (!recipient) {
    throw new Error('WhatsApp recipient number is missing.');
  }

  const response = await providerFetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: getTemplateName(templateKey),
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text', text: cleanParameter(text) })),
          },
        ],
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

function getLinkText(appointment) {
  if (appointment.consultationType === 'virtual') {
    return appointment.meetUrl || 'Your Google Meet link will be shared shortly.';
  }
  return CLINIC_MAPS_URL;
}

function getAppointmentParameters(appointment) {
  return [
    appointment.fullName,
    formatDisplayDate(appointment.appointmentDate),
    getSlotRangeLabel(appointment.timeSlot),
    getConsultationLabel(appointment),
    getLinkText(appointment),
  ];
}

export function sendPatientConfirmationWhatsApp(appointment, to) {
  return sendTemplateMessage(to, 'confirmation', getAppointmentParameters(appointment));
}

export function sendPatientReminderWhatsApp(appointment, to) {
  return sendTemplateMessage(to, 'reminder', getAppointmentParameters(appointment));
}

export function sendPatientFeedbackWhatsApp(appointment, to, feedbackUrl) {
  return sendTemplateMessage(to, 'feedback', [appointment.fullName, feedbackUrl]);
}

export async function sendClinicAlertWhatsApp(appointment) {
  const { clinicNumber } = getWhatsAppConfig();
  if (!clinicNumber) return null;

  return sendTemplateMessage(
    clinicNumber,
    'clinicAlert',
    [
      appointment.fullName,
      formatDisplayDate(appointment.appointmentDate),
      getSlotRangeLabel(appointment.timeSlot),
      getConsultationLabel(appointment),
      appointment.appointmentNumber,
    ],
    { internal: true }
  );
}
