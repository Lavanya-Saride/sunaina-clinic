import Patient from '../models/Patient.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import { normalizePhone } from '../utils/phone.js';

export async function upsertPatient({ name, phone, email, source, whatsappOptIn, optInSource }) {
  const whatsappNumber = normalizePhone(phone);
  const cleanName = sanitizePlainText(name);
  const cleanEmail = sanitizePlainText(email || '').toLowerCase();
  const now = new Date();

  let patient = await Patient.findOne({ whatsappNumber });

  if (!patient) {
    try {
      patient = await Patient.create({
        name: cleanName,
        whatsappNumber,
        email: cleanEmail,
        source,
        whatsappOptIn: Boolean(whatsappOptIn),
        whatsappOptInAt: whatsappOptIn ? now : null,
        whatsappOptInSource: whatsappOptIn ? optInSource : undefined,
      });
      return patient;
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
      patient = await Patient.findOne({ whatsappNumber });
    }
  }

  let changed = false;

  if (!patient.email && cleanEmail) {
    patient.email = cleanEmail;
    changed = true;
  }

  if (whatsappOptIn && (!patient.whatsappOptIn || patient.whatsappOptOutAt)) {
    patient.whatsappOptIn = true;
    patient.whatsappOptInAt = now;
    patient.whatsappOptInSource = optInSource;
    patient.whatsappOptOutAt = null;
    changed = true;
  }

  if (changed) {
    await patient.save();
  }

  return patient;
}

export function canReceiveWhatsApp(patient) {
  return Boolean(patient?.whatsappOptIn) && !patient.whatsappOptOutAt;
}
