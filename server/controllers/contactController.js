import { sendCallbackRequest } from '../services/emailService.js';

export async function requestCallback(req, res, next) {
  try {
    const name = req.body.name.trim();
    const phone = req.body.phone.trim();

    await sendCallbackRequest({
      name,
      phone,
    });

    return res.status(200).json({
      success: true,
      message:
        'Your callback request has been received. Our team will contact you during clinic hours.',
    });
  } catch (error) {
    console.error('CALLBACK REQUEST ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });

    next(error);
  }
}