import mongoose from 'mongoose';

export const TIME_SLOTS = [
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
];

const appointmentSchema = new mongoose.Schema(
  {
    appointmentDate: {
      type: String,
      required: [true, 'Appointment date is required.'],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        'Appointment date must use YYYY-MM-DD format.',
      ],
    },

    timeSlot: {
      type: String,
      required: [true, 'Time slot is required.'],
      enum: {
        values: TIME_SLOTS,
        message: 'Please select a valid time slot.',
      },
    },

    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters.'],
      maxlength: [100, 'Full name must be under 100 characters.'],
    },

    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      maxlength: [25, 'Phone number is too long.'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email is too long.'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index(
  { appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    name: 'unique_appointment_date_time_slot',
  }
);

export default mongoose.model('Appointment', appointmentSchema);