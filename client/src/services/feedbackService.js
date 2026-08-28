import api from './api';

export async function getFeedback() {
  const response = await api.get('/feedback');
  return response.data?.data ?? [];
}

export async function submitFeedback(payload) {
  const response = await api.post('/feedback', payload);
  return response.data;
}
