import mongoose from 'mongoose';

const callbackRequestSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: [
          true,
          'Name is required.',
        ],
        trim: true,
        minlength: [
          2,
          'Name must be at least 2 characters.',
        ],
        maxlength: [
          80,
          'Name must be under 80 characters.',
        ],
      },

      phone: {
        type: String,
        required: [
          true,
          'Phone number is required.',
        ],
        trim: true,
        maxlength: [
          15,
          'Phone number is too long.',
        ],
      },
    },
    {
      timestamps: true,
    }
  );

callbackRequestSchema.index({
  createdAt: -1,
});

export default mongoose.model(
  'CallbackRequest',
  callbackRequestSchema
);