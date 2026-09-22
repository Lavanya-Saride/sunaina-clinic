import api from './api';

export async function getBookedSlots(date) {
  if (!date) return [];
  const response = await api.get('/appointment/booked-slots', { params: { date } });
  const slots = response.data?.data;
  return Array.isArray(slots) ? slots : [];
}

export async function createAppointmentOrder(payload) {
  const response = await api.post('/appointment', payload);
  return response.data;
}

export async function verifyPayment(payload) {
  const response = await api.post('/payment/verify', payload);
  return response.data;
}
