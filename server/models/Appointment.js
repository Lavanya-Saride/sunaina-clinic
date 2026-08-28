import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: String,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    reasonForVisit: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Appointment', appointmentSchema);