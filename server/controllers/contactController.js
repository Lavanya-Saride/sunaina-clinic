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
        'Thank you. Our team will contact you soon.',
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