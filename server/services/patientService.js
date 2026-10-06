import Patient from '../models/Patient.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import { normalizePhone } from '../utils/phone.js';

export async function upsertPatient({ name, phone, email, source, whatsappOptIn, optInSource, recordedBy }) {
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
        whatsappOptInRecordedBy: whatsappOptIn && optInSource === 'DASHBOARD' ? recordedBy : undefined,
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

  const optedOut = Boolean(patient.whatsappOptOutAt);
  const mayOptIn = !optedOut || optInSource !== 'DASHBOARD';

  if (whatsappOptIn && mayOptIn && (!patient.whatsappOptIn || optedOut)) {
    patient.whatsappOptIn = true;
    patient.whatsappOptInAt = now;
    patient.whatsappOptInSource = optInSource;
    patient.whatsappOptInRecordedBy = optInSource === 'DASHBOARD' ? recordedBy : undefined;
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
