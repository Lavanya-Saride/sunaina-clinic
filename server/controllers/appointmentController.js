import Appointment from '../models/Appointment.js';

export const getBookedSlots = async (req, res, next) => {
  try {
    const { date } = req.query;

    const appointments = await Appointment.find({
      appointmentDate: date,
    })
      .select('timeSlot -_id')
      .lean();

    return res.status(200).json({
      success: true,
      data: appointments.map(({ timeSlot }) => timeSlot),
    });
  } catch (error) {
    console.error('GET BOOKED SLOTS ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const {
      service,
      appointmentDate,
      timeSlot,
      fullName,
      phoneNumber,
      email,
      reasonForVisit = '',
    } = req.body;

    console.log('CREATE APPOINTMENT REQUEST:', {
      service,
      appointmentDate,
      timeSlot,
      fullName,
      phoneNumber,
      email,
    });

    const existingAppointment = await Appointment.findOne({
      appointmentDate,
      timeSlot,
    })
      .select('_id')
      .lean();

    if (existingAppointment) {
      console.log(
        'APPOINTMENT SLOT ALREADY BOOKED:',
        appointmentDate,
        timeSlot
      );

      return res.status(409).json({
        success: false,
        message:
          'This time slot has already been booked. Please select another time.',
      });
    }

    const appointment = await Appointment.create({
      service,
      appointmentDate,
      timeSlot,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      reasonForVisit: reasonForVisit.trim(),
    });

    console.log(
      'APPOINTMENT CREATED:',
      appointment._id.toString()
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully.',
      data: {
        id: appointment._id,
        service: appointment.service,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        fullName: appointment.fullName,
        email: appointment.email,
        phoneNumber: appointment.phoneNumber,
        reasonForVisit: appointment.reasonForVisit,
        createdAt: appointment.createdAt,
      },
    });
  } catch (error) {
    console.error('CREATE APPOINTMENT ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      errors: error.errors,
      stack: error.stack,
    });

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'This time slot has already been booked. Please select another time.',
      });
    }

    next(error);
  }
};