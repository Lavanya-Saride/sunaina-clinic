import Feedback from '../models/Feedback.js';
import { sanitizePlainText } from '../utils/sanitize.js';
export async function getFeedback(req, res, next) {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .select('name service story createdAt updatedAt')
      .lean();

    res.status(200).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
}
export async function createFeedback(req, res, next) {
  try {
    const name = sanitizePlainText(req.body.name);
    const service = sanitizePlainText(req.body.service);
    const story = sanitizePlainText(req.body.story);

    const feedback = await Feedback.create({ name, service, story });

    res.status(201).json({
      success: true,
      message: 'Thank you for sharing your feedback.',
      data: {
        id: feedback._id,
        name: feedback.name,
        service: feedback.service,
        story: feedback.story,
        createdAt: feedback.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
