import { PAYMENT_HOLD_HOURS } from '../config/appointmentConfig.js';
import {
  createAppointmentRecord,
  getUnavailableSlots,
  releaseExpiredHolds,
} from '../services/appointmentService.js';

export const getBookedSlots = async (req, res, next) => {
  try {
    const { date } = req.query;

    await releaseExpiredHolds({ appointmentDate: date });

    return res.status(200).json({
      success: true,
      data: await getUnavailableSlots(date),
    });
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const {
      appointmentDate,
      timeSlot,
      consultationType,
      fullName,
      phoneNumber,
      email,
      whatsappOptIn,
    } = req.body;

    const appointment = await createAppointmentRecord({
      appointmentDate,
      timeSlot,
      consultationType,
      fullName,
      phoneNumber,
      email,
      source: 'WEBSITE',
      whatsappOptIn: whatsappOptIn === true,
      optInSource: 'WEBSITE_BOOKING',
      withHold: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Your appointment request has been received.',
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        consultationType: appointment.consultationType,
        status: appointment.status,
        amount: appointment.fee,
        currency: appointment.currency,
        holdExpiresAt: appointment.holdExpiresAt,
        holdHours: PAYMENT_HOLD_HOURS,
        upiId: process.env.CLINIC_UPI_ID?.trim() || '',
      },
    });
  } catch (error) {
    next(error);
  }
};
