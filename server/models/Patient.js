import mongoose from 'mongoose';

export const PATIENT_SOURCES = ['WEBSITE', 'OFFLINE'];
export const OPT_IN_SOURCES = ['WEBSITE_BOOKING', 'DASHBOARD'];

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required.'],
      trim: true,
      minlength: [2, 'Patient name must be at least 2 characters.'],
      maxlength: [100, 'Patient name must be under 100 characters.'],
    },
    whatsappNumber: {
      type: String,
      required: [true, 'Patient phone number is required.'],
      unique: true,
      trim: true,
      maxlength: [15, 'Phone number is too long.'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email is too long.'],
      default: '',
    },
    whatsappOptIn: {
      type: Boolean,
      default: false,
    },
    whatsappOptInAt: {
      type: Date,
      default: null,
    },
    whatsappOptInSource: {
      type: String,
      enum: OPT_IN_SOURCES,
    },
    whatsappOptOutAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: PATIENT_SOURCES,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

patientSchema.index({ name: 1 });

export default mongoose.model('Patient', patientSchema);
