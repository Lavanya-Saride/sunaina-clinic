import { getSlotMinutes } from '../utils/appointmentTime.js';

export const APPOINTMENT_FEE = 500;
export const CLINIC_CONSULTATION_FEE = Number(process.env.CLINIC_CONSULTATION_FEE) || APPOINTMENT_FEE;
export const VIRTUAL_CONSULTATION_FEE = Number(process.env.VIRTUAL_CONSULTATION_FEE) || APPOINTMENT_FEE;
export const APPOINTMENT_DURATION_MINUTES = 30;
export const PAYMENT_HOLD_HOURS = Number(process.env.PAYMENT_HOLD_HOURS) || 24;
export const CONSULTATION_TYPES = ['offline', 'virtual'];
export const PAYMENT_METHODS = ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'];
export const CLINIC_MAPS_URL =
  process.env.CLINIC_MAPS_URL?.trim() ||
  'https://www.google.com/maps/dir/?api=1&destination=23.375408%2C85.335911&travelmode=driving&dir_action=navigate';

export function getConsultationFee(consultationType) {
  return consultationType === 'virtual' ? VIRTUAL_CONSULTATION_FEE : CLINIC_CONSULTATION_FEE;
}

export function getSlotEndLabel(timeSlot) {
  const totalMinutes = getSlotMinutes(timeSlot) + APPOINTMENT_DURATION_MINUTES;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  const endPeriod = endHour >= 12 ? 'PM' : 'AM';
  const displayHour = endHour % 12 === 0 ? 12 : endHour % 12;

  return `${String(displayHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} ${endPeriod}`;
}
