const IST_OFFSET = '+05:30';

export function getSlotMinutes(timeSlot) {
  const [time, period] = String(timeSlot).split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour = hours;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minutes;
}

export function getSlotStart(date, timeSlot) {
  const total = getSlotMinutes(timeSlot);
  const hour = String(Math.floor(total / 60)).padStart(2, '0');
  const minute = String(total % 60).padStart(2, '0');
  return new Date(`${date}T${hour}:${minute}:00${IST_OFFSET}`);
}

export function getSlotEnd(date, timeSlot, durationMinutes) {
  return new Date(getSlotStart(date, timeSlot).getTime() + durationMinutes * 60 * 1000);
}

export function getTodayString(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function getNowMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const pick = (type) => Number(parts.find((part) => part.type === type)?.value);
  return (pick('hour') % 24) * 60 + pick('minute');
}

export function isSunday(date) {
  return new Date(`${date}T12:00:00${IST_OFFSET}`).getUTCDay() === 0;
}

export function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDisplayDate(date) {
  return new Date(`${date}T12:00:00${IST_OFFSET}`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
