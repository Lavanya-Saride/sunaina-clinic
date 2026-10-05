import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { upsertPatient } from '../services/patientService.js';
import { getSlotStart } from '../utils/appointmentTime.js';
import { normalizePhone } from '../utils/phone.js';

const LEGACY_SLOT_INDEX = 'unique_appointment_date_time_slot';
const IGNORABLE_INDEX_ERRORS = ['IndexNotFound', 'NamespaceNotFound'];

async function dropLegacySlotIndex(collection) {
  try {
    await collection.dropIndex(LEGACY_SLOT_INDEX);
  } catch (error) {
    if (!IGNORABLE_INDEX_ERRORS.includes(error?.codeName)) {
      throw error;
    }
  }
}

function buildBackfill(doc, patientId) {
  const set = {
    startsAt: getSlotStart(doc.appointmentDate, doc.timeSlot),
    fullNameKey: String(doc.fullName || '').trim().toLowerCase(),
    phoneNormalized: normalizePhone(doc.phoneNumber),
    source: doc.source || 'WEBSITE',
  };

  if (patientId) {
    set.patientId = patientId;
  }

  if (doc.status !== 'CANCELLED') {
    set.slotKey = `${doc.appointmentDate}|${doc.timeSlot}`;
  }

  if (doc.googleEventId && (doc.consultationType !== 'virtual' || doc.meetUrl)) {
    set.calendarStatus = 'READY';
  }

  if (doc.paymentStatus === 'PAID' && !doc.paymentMethod) {
    set.paymentMethod = doc.paymentId ? 'RAZORPAY' : 'OTHER';
    set.paymentAmount = doc.fee;
    set.paymentConfirmedAt = doc.updatedAt || new Date();
  }

  if (doc.status === 'COMPLETED') {
    set.feedbackEligible = true;
    set.feedbackRequested = true;
  }

  return set;
}

export async function runMigrations() {
  await Promise.all([Appointment.init(), Patient.init(), User.init(), Session.init()]);

  const collection = Appointment.collection;

  await dropLegacySlotIndex(collection);

  await collection.updateMany({ status: 'NO_SHOW' }, { $set: { status: 'ABSENT' } });

  await collection.updateMany(
    {
      startsAt: { $exists: false },
      status: 'PENDING_PAYMENT',
      paymentOrderId: { $nin: ['', null] },
      holdExpiresAt: { $lte: new Date() },
    },
    {
      $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Payment hold expired' },
      $unset: { slotKey: 1 },
    }
  );

  const pending = await collection.find({ startsAt: { $exists: false } }).toArray();

  let failed = 0;

  for (const doc of pending) {
    let patientId;

    try {
      const patient = await upsertPatient({
        name: doc.fullName,
        phone: doc.phoneNumber,
        email: doc.email,
        source: 'WEBSITE',
        whatsappOptIn: false,
      });
      patientId = patient._id;
    } catch (error) {
      failed += 1;
      console.error('MIGRATION: patient link skipped', { appointmentId: doc._id.toString(), reason: error.name });
    }

    await collection.updateOne({ _id: doc._id }, { $set: buildBackfill(doc, patientId) });
  }

  return { migrated: pending.length, patientLinkFailures: failed };
}
