import { body, validationResult } from 'express-validator';

export const feedbackValidationRules = [
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('Name is required.')
    .bail()
    .isString()
    .withMessage('Name must be text.')
    .bail()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters.'),

  body('story')
    .exists({ checkFalsy: true })
    .withMessage('Story is required.')
    .bail()
    .isString()
    .withMessage('Story must be text.')
    .bail()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Story must be between 10 and 1000 characters.'),
];

export function rejectUnknownFields(req, res, next) {
  const allowedFields = ['name', 'story'];
  const receivedFields = Object.keys(req.body || {});

  const unexpected = receivedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (unexpected.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unexpected field(s) in request: ${unexpected.join(', ')}.`,
    });
  }

  next();
}

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields.',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }

  next();
}