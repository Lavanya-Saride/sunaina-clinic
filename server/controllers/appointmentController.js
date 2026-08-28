import Appointment from '../models/Appointment.js';

export const createAppointment = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      service,
      appointmentDate,
      timeSlot,
      reasonForVisit
    } = req.body;

    if (
      !fullName ||
      !phoneNumber ||
      !service ||
      !appointmentDate ||
      !timeSlot
    ) {
      return res.status(400).json({
        message: 'Please fill in all required fields.'
      });
    }

    const appointment = await Appointment.create({
      fullName,
      phoneNumber,
      email,
      service,
      appointmentDate,
      timeSlot,
      reasonForVisit
    });

    return res.status(201).json({
      message: 'Appointment request submitted successfully.',
      appointment
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to submit appointment request.',
      error: error.message
    });
  }
};