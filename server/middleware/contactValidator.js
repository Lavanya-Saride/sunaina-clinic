import { body, validationResult } from 'express-validator';

export const contactValidationRules = [
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

  body('phone')
    .exists({ checkFalsy: true })
    .withMessage('Phone number is required.')
    .bail()
    .isString()
    .withMessage('Phone number must be text.')
    .bail()
    .trim()
    .isLength({ min: 7, max: 25 })
    .withMessage('Please enter a valid phone number.'),
];

export function handleContactValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid name and phone number.',
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
}