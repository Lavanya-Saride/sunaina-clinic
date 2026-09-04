export const FEEDBACK_LIMITS = {
  name: { min: 2, max: 80 },
  story: { min: 10, max: 1000 },
};

export function validateFeedbackForm({ name, story }) {
  const errors = {};

  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    errors.name = 'Please enter your name.';
  } else if (trimmedName.length < FEEDBACK_LIMITS.name.min) {
    errors.name = `Name must be at least ${FEEDBACK_LIMITS.name.min} characters.`;
  } else if (trimmedName.length > FEEDBACK_LIMITS.name.max) {
    errors.name = `Name must be under ${FEEDBACK_LIMITS.name.max} characters.`;
  }

  const trimmedStory = (story || '').trim();

  if (!trimmedStory) {
    errors.story = 'Please share a few words about your experience.';
  } else if (trimmedStory.length < FEEDBACK_LIMITS.story.min) {
    errors.story = `Please share at least ${FEEDBACK_LIMITS.story.min} characters.`;
  } else if (trimmedStory.length > FEEDBACK_LIMITS.story.max) {
    errors.story = `Please keep your story under ${FEEDBACK_LIMITS.story.max} characters.`;
  }

  return errors;
}