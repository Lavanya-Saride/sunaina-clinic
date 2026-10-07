import { Router } from 'express';
import { getGooglePlaceDetails } from '../services/googlePlacesService.js';
import { logEvent } from '../utils/logger.js';

const router = Router();

router.get('/reviews', async (req, res, next) => {
  try {
    const place = await getGooglePlaceDetails();

    const reviews = Array.isArray(place.reviews)
      ? place.reviews.map((review) => ({
          name:
            review.authorAttribution?.displayName ||
            'Google User',
          authorUrl:
            review.authorAttribution?.uri || '',
          photoUrl:
            review.authorAttribution?.photoUri || '',
          rating: review.rating || 0,
          story:
            review.text?.text ||
            review.originalText?.text ||
            '',
          relativePublishTimeDescription:
            review.relativePublishTimeDescription ||
            '',
          publishTime:
            review.publishTime || '',
          reviewUrl:
            review.googleMapsUri ||
            place.googleMapsUri ||
            '',
          flagContentUrl:
            review.flagContentUri || '',
        }))
      : [];

    return res.status(200).json({
      success: true,
      place: {
        id: place.id,
        name: place.displayName?.text || '',
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        googleMapsUrl: place.googleMapsUri || '',
        reviews,
      },
    });
  } catch (error) {
    logEvent('error', 'places.request_failed', { status: error.status, message: error.message });

    return res.status(502).json({
      success: false,
      message: 'Unable to load Google reviews.',
    });
  }
});

export default router;