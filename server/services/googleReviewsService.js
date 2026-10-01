const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

export async function getGoogleReviews() {
  const response = await fetch(
    `${API_URL}/google-places/reviews`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data?.message ||
        'Unable to load Google reviews.'
    );
  }

  return data;
}