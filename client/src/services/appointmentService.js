import api from './api';

export async function submitAppointment(payload) {
  const response = await api.post('/appointment', payload);
  return response.data;
}

export async function getBookedSlots(date) {
  const response = await api.get('/appointment/booked-slots', {
    params: { date },
  });

  return response.data?.data ?? [];
}