import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import { createVirtualConsultation, extractMeetUrl } from '../services/googleCalendarService.js';
import { createHash } from 'node:crypto';
import {
  fetchRazorpayPayment,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../services/razorpayService.js';
import {
  sendAppointmentConfirmationToClinic,
  sendAppointmentConfirmationToPatient,
} from '../services/emailService.js';
import {
  sendClinicAppointmentWhatsApp,
  sendPatientAppointmentWhatsApp,
} from '../services/whatsappService.js';

async function fulfillAppointment(appointment, payment) {
  if (!appointment || !payment || payment.status !== 'PAID') return appointment;

  if (appointment.status !== 'CONFIRMED') {
    appointment.status = 'CONFIRMED';
    appointment.paymentStatus = 'PAID';
    appointment.holdExpiresAt = null;
    await appointment.save();
  }

  if (appointment.consultationType === 'offline') {
    appointment.meetingStatus = 'NOT_REQUIRED';
    await appointment.save();
  }

  if (appointment.consultationType === 'virtual' && !appointment.meetUrl) {
    try {
      const event = await createVirtualConsultation({ appointment });
      const meetUrl = extractMeetUrl(event);

      if (!meetUrl) {
        throw new Error('Google Meet link was not generated.');
      }

      appointment.googleEventId = event.id || '';
      appointment.meetUrl = meetUrl;
      appointment.meetingStatus = 'READY';
    } catch (error) {
      appointment.meetingStatus = 'FAILED';
      console.error('GOOGLE MEET CREATION ERROR:', error.message);
    }
    await appointment.save();
  }

  if (appointment.patientEmailStatus !== 'SENT') {
    try {
      await sendAppointmentConfirmationToPatient(
        appointment,
        `appointment-patient-${appointment._id}`
      );
      appointment.patientEmailStatus = 'SENT';
      await appointment.save();
    } catch (error) {
      appointment.patientEmailStatus = 'FAILED';
      await appointment.save();
      console.error('PATIENT APPOINTMENT EMAIL ERROR:', error.message);
    }
  }

  if (appointment.clinicEmailStatus !== 'SENT') {
    try {
      await sendAppointmentConfirmationToClinic(
        appointment,
        `appointment-clinic-${appointment._id}`
      );
      appointment.clinicEmailStatus = 'SENT';
      await appointment.save();
    } catch (error) {
      appointment.clinicEmailStatus = 'FAILED';
      await appointment.save();
      console.error('CLINIC APPOINTMENT EMAIL ERROR:', error.message);
    }
  }

  if (appointment.patientWhatsappStatus !== 'SENT') {
    try {
      await sendPatientAppointmentWhatsApp(appointment);
      appointment.patientWhatsappStatus = 'SENT';
      await appointment.save();
    } catch (error) {
      appointment.patientWhatsappStatus = 'FAILED';
      await appointment.save();
      console.error('PATIENT APPOINTMENT WHATSAPP ERROR:', error.message);
    }
  }

  if (appointment.clinicWhatsappStatus !== 'SENT') {
    try {
      await sendClinicAppointmentWhatsApp(appointment);
      appointment.clinicWhatsappStatus = 'SENT';
      await appointment.save();
    } catch (error) {
      appointment.clinicWhatsappStatus = 'FAILED';
      await appointment.save();
      console.error('CLINIC APPOINTMENT WHATSAPP ERROR:', error.message);
    }
  }

  return appointment;
}

async function markPaymentPaid({ payment, appointment, paymentId }) {
  payment.status = 'PAID';
  payment.providerPaymentId = paymentId || payment.providerPaymentId;
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  appointment.paymentStatus = 'PAID';
  appointment.paymentId = payment.providerPaymentId;
  await appointment.save();

  return fulfillAppointment(appointment, payment);
}

export const verifyPayment = async (req, res, next) => {
  try {
    const {
      appointmentId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    const valid = verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    const payment = await Payment.findOne({ providerOrderId: orderId });
    const appointment = await Appointment.findById(appointmentId);

    if (!payment || !appointment || payment.appointmentId.toString() !== appointment._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Appointment payment could not be found.',
      });
    }

    const gatewayPayment = await fetchRazorpayPayment(paymentId);
    if (gatewayPayment.order_id !== orderId || gatewayPayment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Payment has not been captured.',
      });
    }

    if (Number(gatewayPayment.amount) !== payment.amount * 100 || gatewayPayment.currency !== payment.currency) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount could not be verified.',
      });
    }

    const updatedAppointment = await markPaymentPaid({
      payment,
      appointment,
      paymentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment successful. Your appointment is confirmed.',
      data: {
        appointmentId: updatedAppointment._id,
        appointmentNumber: updatedAppointment.appointmentNumber,
        appointmentDate: updatedAppointment.appointmentDate,
        timeSlot: updatedAppointment.timeSlot,
        consultationType: updatedAppointment.consultationType,
        meetUrl: updatedAppointment.meetUrl || '',
      },
    });
  } catch (error) {
    console.error('PAYMENT VERIFICATION ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    next(error);
  }
};

export const paymentWebhook = async (req, res, next) => {
  try {
    const signature = req.get('X-Razorpay-Signature');
    const rawBody = req.rawBody;

    if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature.',
      });
    }

    const eventId = req.get('X-Razorpay-Event-Id') || createHash('sha256').update(rawBody).digest('hex');
    const event = req.body;
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (!['payment.captured', 'order.paid', 'payment.failed'].includes(event?.event)) {
      return res.status(200).json({ success: true });
    }

    if (!orderId) {
      return res.status(200).json({ success: true });
    }

    const payment = await Payment.findOne({ providerOrderId: orderId });
    if (!payment) return res.status(200).json({ success: true });

    const duplicateEvent = eventId && payment.webhookEventIds.includes(eventId);

    if (eventId && !duplicateEvent) {
      payment.webhookEventIds.push(eventId);
      await payment.save();
    }

    const appointment = await Appointment.findById(payment.appointmentId);
    if (!appointment) return res.status(200).json({ success: true });

    if (event?.event === 'payment.failed') {
      if (payment.status === 'PAID' || appointment.paymentStatus === 'PAID' || appointment.status === 'CONFIRMED') {
        return res.status(200).json({ success: true });
      }

      payment.status = 'FAILED';
      await payment.save();
      appointment.paymentStatus = 'FAILED';
      appointment.status = 'CANCELLED';
      await appointment.save();
      await Appointment.deleteOne({ _id: appointment._id, status: 'CANCELLED' });
      return res.status(200).json({ success: true });
    }

    if (!paymentId) {
      return res.status(200).json({ success: true });
    }

    if (payment.status !== 'PAID') {
      await markPaymentPaid({ payment, appointment, paymentId });
    } else if (appointment.status === 'CONFIRMED') {
      await fulfillAppointment(appointment, payment);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('RAZORPAY WEBHOOK ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    next(error);
  }
};
