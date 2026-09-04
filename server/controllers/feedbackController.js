import Feedback from '../models/Feedback.js';
import { sanitizePlainText } from '../utils/sanitize.js';

export async function getFeedback(req, res, next) {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name story createdAt updatedAt')
      .lean();

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (err) {
    next(err);
  }
}

export async function createFeedback(req, res, next) {
  try {
    const name = sanitizePlainText(req.body.name);
    const story = sanitizePlainText(req.body.story);

    const feedback = await Feedback.create({
      name,
      story,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for sharing your feedback.',
      data: {
        id: feedback._id,
        name: feedback.name,
        story: feedback.story,
        createdAt: feedback.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}