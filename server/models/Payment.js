import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'razorpay',
      immutable: true,
    },
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: '',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      immutable: true,
    },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'CREATED',
      index: true,
    },
    webhookEventIds: {
      type: [String],
      default: [],
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Payment', paymentSchema);
