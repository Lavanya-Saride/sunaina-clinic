import api from './api';

export async function getBookedSlots(date, { signal } = {}) {
  if (!date) return [];
  const response = await api.get('/appointment/booked-slots', { params: { date }, signal });
  const slots = response.data?.data;
  return Array.isArray(slots) ? slots : [];
}

export async function createAppointment(payload) {
  const response = await api.post('/appointment', payload);
  return response.data;
}
