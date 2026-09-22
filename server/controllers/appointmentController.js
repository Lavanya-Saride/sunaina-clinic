import { randomBytes } from 'node:crypto';
import Appointment from '../models/Appointment.js';
import { PAYMENT_HOLD_MINUTES, getConsultationFee } from '../config/appointmentConfig.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import Payment from '../models/Payment.js';
import { createRazorpayOrder, fetchRazorpayOrder, getRazorpayKeyId } from '../services/razorpayService.js';

function generateAppointmentNumber(appointmentDate) {
  const compactDate = appointmentDate.replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `SC${compactDate}${suffix}`;
}

export const getBookedSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const now = new Date();

    const expiredAppointments = await Appointment.find({
      appointmentDate: date,
      status: 'PENDING_PAYMENT',
      holdExpiresAt: { $lte: now },
    }).select('_id paymentOrderId').lean();

    for (const expired of expiredAppointments) {
      if (!expired.paymentOrderId) {
        await Appointment.deleteOne({ _id: expired._id });
        continue;
      }

      try {
        const order = await fetchRazorpayOrder(expired.paymentOrderId);
        if (order?.status === 'paid') continue;
        await Appointment.deleteOne({ _id: expired._id, status: 'PENDING_PAYMENT' });
      } catch {
        continue;
      }
    }

    const appointments = await Appointment.find({
      appointmentDate: date,
      $or: [
        { status: { $in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
        { status: 'PENDING_PAYMENT', holdExpiresAt: { $gt: now } },
      ],
    })
      .select('timeSlot -_id')
      .lean();

    return res.status(200).json({
      success: true,
      data: appointments.map(({ timeSlot }) => timeSlot),
    });
  } catch (error) {
    next(error);
  }
};

export const createAppointmentOrder = async (req, res, next) => {
  let appointment = null;

  try {
    const {
      appointmentDate,
      timeSlot,
      consultationType,
      fullName,
      phoneNumber,
      email,
    } = req.body;

    const now = new Date();

    const expiredAppointment = await Appointment.findOne({
      appointmentDate,
      timeSlot,
      status: 'PENDING_PAYMENT',
      holdExpiresAt: { $lte: now },
    }).select('_id paymentOrderId').lean();

    if (expiredAppointment) {
      if (!expiredAppointment.paymentOrderId) {
        await Appointment.deleteOne({ _id: expiredAppointment._id });
      } else {
        try {
          const order = await fetchRazorpayOrder(expiredAppointment.paymentOrderId);
          if (order?.status !== 'paid') {
            await Appointment.deleteOne({ _id: expiredAppointment._id, status: 'PENDING_PAYMENT' });
          }
        } catch {
          return res.status(503).json({
            success: false,
            message: 'Unable to verify the selected time slot. Please try again.',
          });
        }
      }
    }

    const activeAppointment = await Appointment.findOne({
      appointmentDate,
      timeSlot,
      $or: [
        { status: { $in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
        { status: 'PENDING_PAYMENT', holdExpiresAt: { $gt: now } },
      ],
    }).select('_id').lean();

    if (activeAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot has already been booked. Please select another time.',
      });
    }

    const fee = getConsultationFee(consultationType);

    appointment = await Appointment.create({
      appointmentNumber: generateAppointmentNumber(appointmentDate),
      appointmentDate,
      timeSlot,
      consultationType,
      fullName: sanitizePlainText(fullName),
      phoneNumber: sanitizePlainText(phoneNumber),
      email: sanitizePlainText(email).toLowerCase(),
      fee,
      currency: 'INR',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'CREATED',
      holdExpiresAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000),
      meetingStatus: consultationType === 'virtual' ? 'PENDING' : 'NOT_REQUIRED',
    });

    const receipt = `SC${appointment._id.toString().slice(-20)}`;
    const order = await createRazorpayOrder({
      amount: fee,
      receipt,
    });

    appointment.paymentOrderId = order.id;
    appointment.paymentStatus = 'PENDING';
    await appointment.save();

    const payment = await Payment.create({
      appointmentId: appointment._id,
      providerOrderId: order.id,
      amount: fee,
      currency: 'INR',
      status: 'CREATED',
    });

    return res.status(201).json({
      success: true,
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        timeSlot: appointment.timeSlot,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
        holdExpiresAt: appointment.holdExpiresAt,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    if (appointment?._id) {
      await Appointment.deleteOne({ _id: appointment._id }).catch(() => {});
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This time slot has already been booked. Please select another time.',
      });
    }

    next(error);
  }
};

export const createAppointment = createAppointmentOrder;
