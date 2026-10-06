import api from './api';

export async function getFeedback({ signal } = {}) {
  const response = await api.get('/feedback', { signal });
  return response.data?.data ?? [];
}

export async function submitFeedback(payload) {
  const response = await api.post('/feedback', payload);
  return response.data;
}
