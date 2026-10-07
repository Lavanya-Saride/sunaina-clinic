export const STATUS_TABS = [
  { value: 'PENDING_PAYMENT', label: 'Pending Payment', defaultSort: 'appointmentDateTime:asc' },
  { value: 'CONFIRMED', label: 'Confirmed / Upcoming', defaultSort: 'appointmentDateTime:asc' },
  { value: 'COMPLETED', label: 'Completed', defaultSort: 'appointmentDateTime:desc' },
  { value: 'ABSENT', label: 'Absent', defaultSort: 'appointmentDateTime:desc' },
  { value: 'CANCELLED', label: 'Cancelled', defaultSort: 'appointmentDateTime:desc' },
];

export const STATUS_TONES = {
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'brand',
  COMPLETED: 'success',
  ABSENT: 'danger',
  CANCELLED: 'neutral',
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

export const SORT_OPTIONS = [
  { value: 'appointmentDateTime:asc', label: 'Date: earliest first' },
  { value: 'appointmentDateTime:desc', label: 'Date: latest first' },
  { value: 'createdAt:desc', label: 'Newest added' },
  { value: 'createdAt:asc', label: 'Oldest added' },
  { value: 'patientName:asc', label: 'Name: A to Z' },
  { value: 'patientName:desc', label: 'Name: Z to A' },
];

export const EMPTY_FILTERS = {
  search: '',
  dateFrom: getIndianToday(),
  dateTo: getIndianToday(),
};

export function getIndianToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00+05:30`);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) {
    return 'Unable to reach the server. Please check your connection.';
  }
  return error.response.data?.message || fallback;
}

export function hasFailedAutomation(appointment) {
  const failed = Object.values(appointment.notifications || {}).includes('FAILED');
  return failed || appointment.calendarStatus === 'FAILED' || appointment.meetingStatus === 'FAILED';
}

export function isAwaitingAttendance(appointment, now = Date.now()) {
  return appointment.status === 'CONFIRMED' && new Date(appointment.startsAt).getTime() + 30 * 60 * 1000 < now;
}

export function canRetryAutomation(appointment) {
  if (appointment.status === 'CANCELLED') {
    return appointment.calendarStatus === 'FAILED';
  }

  return ['CONFIRMED', 'COMPLETED'].includes(appointment.status) && hasFailedAutomation(appointment);
}
