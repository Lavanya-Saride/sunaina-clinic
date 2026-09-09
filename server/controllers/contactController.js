import CallbackRequest from '../models/CallbackRequest.js';
import { sendCallbackRequest } from '../services/emailService.js';
import { sanitizePlainText } from '../utils/sanitize.js';

export async function requestCallback(req, res, next) {
  try {
    const name = sanitizePlainText(req.body.name);
    const phone = sanitizePlainText(req.body.phone);

    const callbackRequest = await CallbackRequest.create({
      name,
      phone,
    });

    try {
      await sendCallbackRequest({
        name,
        phone,
        idempotencyKey: `callback-${callbackRequest._id.toString()}`,
      });
    } catch (emailError) {
      console.error('CALLBACK EMAIL ERROR:', {
        message: emailError.message,
        name: emailError.name,
        code: emailError.code,
        statusCode: emailError.statusCode,
      });

      return res.status(503).json({
        success: false,
        message:
          'Unable to submit your request. Please try again.',
        data: {
          id: callbackRequest._id,
          createdAt: callbackRequest.createdAt,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message:
        'Thank you. Our team will contact you soon.',
      data: {
        id: callbackRequest._id,
        createdAt: callbackRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('CALLBACK REQUEST ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    next(error);
  }
}