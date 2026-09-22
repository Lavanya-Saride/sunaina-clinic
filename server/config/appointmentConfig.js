export const APPOINTMENT_FEE = 500;
export const CLINIC_CONSULTATION_FEE = Number(process.env.CLINIC_CONSULTATION_FEE) || APPOINTMENT_FEE;
export const VIRTUAL_CONSULTATION_FEE = Number(process.env.VIRTUAL_CONSULTATION_FEE) || APPOINTMENT_FEE;
export const APPOINTMENT_DURATION_MINUTES = 30;
export const PAYMENT_HOLD_MINUTES = 10;
export const CONSULTATION_TYPES = ['offline', 'virtual'];
export const CLINIC_MAPS_URL =
  process.env.CLINIC_MAPS_URL?.trim() ||
  'https://www.google.com/maps/dir/?api=1&destination=23.375408%2C85.335911&travelmode=driving&dir_action=navigate';

export function getConsultationFee(consultationType) {
  return consultationType === 'virtual' ? VIRTUAL_CONSULTATION_FEE : CLINIC_CONSULTATION_FEE;
}

export function getSlotEndLabel(timeSlot) {
  const [time, period] = timeSlot.split(' ');
  const [hoursValue, minutesValue] = time.split(':').map(Number);
  let hour = hoursValue;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const totalMinutes = hour * 60 + minutesValue + APPOINTMENT_DURATION_MINUTES;
  let endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  const endPeriod = endHour >= 12 ? 'PM' : 'AM';
  const displayHour = endHour % 12 === 0 ? 12 : endHour % 12;

  return `${String(displayHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} ${endPeriod}`;
}
