import { Router } from 'express';
import { getGooglePlaceDetails } from '../services/googlePlacesService.js';

const router = Router();

router.get('/reviews', async (req, res, next) => {
  try {
    const place = await getGooglePlaceDetails();

    return res.status(200).json({
      success: true,
      place: {
        id: place.id,
        name: place.displayName?.text || '',
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        googleMapsUrl: place.googleMapsUri || '',
        reviews: place.reviews || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;