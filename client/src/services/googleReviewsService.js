import api from './api';

export async function getGoogleReviews() {
  const response = await api.get('/google-places/reviews');
  const data = response.data;

  if (!data?.success) {
    throw new Error(data?.message || 'Unable to load Google reviews.');
  }

  return data;
}
