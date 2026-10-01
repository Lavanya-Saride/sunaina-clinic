function getGooglePlacesConfig() {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY?.trim();

  const placeId =
    process.env.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) {
    throw new Error(
      'Google Places configuration is incomplete.'
    );
  }

  return {
    apiKey,
    placeId,
  };
}

export async function getGooglePlaceDetails() {
  const {
    apiKey,
    placeId,
  } = getGooglePlacesConfig();

  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'id,displayName,rating,userRatingCount,reviews,googleMapsUri',
      Accept: 'application/json',
    },
  });

  const data =
    await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
        'Google Places request failed.'
    );

    error.status = response.status;

    throw error;
  }

  return data;
}