import mongoose from 'mongoose';

export const SERVICE_OPTIONS = ['Maternity Care', 'Gynecology', 'Wellness', 'Others'];

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [80, 'Name must be under 80 characters.'],
    },
    story: {
      type: String,
      required: [true, 'Story is required.'],
      trim: true,
      minlength: [10, 'Story must be at least 10 characters.'],
      maxlength: [1000, 'Story must be under 1000 characters.'],
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
