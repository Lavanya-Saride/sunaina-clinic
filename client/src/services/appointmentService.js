import api from './api';

export async function getBookedSlots(date) {
  if (!date) {
    return [];
  }

  const response = await api.get('/appointment/booked-slots', {
    params: {
      date,
    },
  });

  const slots = response.data?.data;

  return Array.isArray(slots) ? slots : [];
}

export async function submitAppointment(payload) {
  const response = await api.post('/appointment', payload);

  return response.data;
}