import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { TIME_SLOTS } from '../utils/constants';
import {
  getBookedSlots,
  submitAppointment,
} from '../services/appointmentService';

const EMPTY_FORM = {
  appointmentDate: '',
  timeSlot: '',
  fullName: '',
  phoneNumber: '',
  email: '',
};

function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isPastTimeSlot(slot) {
  const parts = slot.split(' ');

  if (parts.length !== 2) {
    return false;
  }

  const [time, period] = parts;
  const [hours, minutes] = time.split(':').map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    !['AM', 'PM'].includes(period)
  ) {
    return false;
  }

  let hour = hours;

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  }

  if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  const now = new Date();
  const slotTime = new Date();

  slotTime.setHours(hour, minutes, 0, 0);

  return slotTime <= now;
}

export default function AppointmentForm() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const isToday =
    formData.appointmentDate === getToday();

  const availableSlots = useMemo(() => {
    return TIME_SLOTS.map((slot) => ({
      slot,
      booked: bookedSlots.includes(slot),
      past: isToday && isPastTimeSlot(slot),
    }));
  }, [bookedSlots, isToday]);

  useEffect(() => {
    let isMounted = true;

    async function loadBookedSlots() {
      if (!formData.appointmentDate) {
        setBookedSlots([]);
        setIsLoadingSlots(false);
        return;
      }

      setIsLoadingSlots(true);
      setBookedSlots([]);

      try {
        const slots = await getBookedSlots(
          formData.appointmentDate
        );

        if (!isMounted) {
          return;
        }

        const validBookedSlots = Array.isArray(slots)
          ? slots.filter((slot) =>
              TIME_SLOTS.includes(slot)
            )
          : [];

        setBookedSlots(validBookedSlots);
      } catch {
        if (isMounted) {
          setBookedSlots([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadBookedSlots();

    return () => {
      isMounted = false;
    };
  }, [formData.appointmentDate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage('');
    setIsSuccess(false);
  };

  const handleDateChange = (event) => {
    const date = event.target.value;

    setFormData((current) => ({
      ...current,
      appointmentDate: date,
      timeSlot: '',
    }));

    setBookedSlots([]);
    setMessage('');
    setIsSuccess(false);
  };

  const handleTimeChange = (event) => {
    const time = event.target.value;

    if (bookedSlots.includes(time)) {
      return;
    }

    if (isToday && isPastTimeSlot(time)) {
      return;
    }

    setFormData((current) => ({
      ...current,
      timeSlot: time,
    }));

    setMessage('');
    setIsSuccess(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.appointmentDate) {
      setIsSuccess(false);
      setMessage('Please select an appointment date.');
      return;
    }

    if (!formData.timeSlot) {
      setIsSuccess(false);
      setMessage('Please select an appointment time.');
      return;
    }

    if (bookedSlots.includes(formData.timeSlot)) {
      setFormData((current) => ({
        ...current,
        timeSlot: '',
      }));

      return;
    }

    if (
      isToday &&
      isPastTimeSlot(formData.timeSlot)
    ) {
      setFormData((current) => ({
        ...current,
        timeSlot: '',
      }));

      return;
    }

    if (isLoadingSlots) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await submitAppointment({
        appointmentDate: formData.appointmentDate,
        timeSlot: formData.timeSlot,
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
      });

      setIsSuccess(true);

      setMessage(
        response?.message ||
          'Appointment successfully booked.'
      );

      setFormData(EMPTY_FORM);
      setBookedSlots([]);
    } catch (error) {
      if (error?.response?.status === 409) {
        const attemptedSlot = formData.timeSlot;

        setBookedSlots((current) =>
          current.includes(attemptedSlot)
            ? current
            : [...current, attemptedSlot]
        );

        setFormData((current) => ({
          ...current,
          timeSlot: '',
        }));

        return;
      }

      setIsSuccess(false);
      setMessage(
        error?.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-7">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-maroon mb-5 hover:underline"
      >
        <ArrowLeft size={15} />
        Back to Home
      </Link>

      <div className="bg-white border border-line rounded-3xl shadow-card p-6 sm:p-8 lg:p-10">
        <div className="mb-8">
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.12em] text-maroon uppercase mb-2">
            Sunaina Clinic
          </p>

          <h1 className="text-2xl sm:text-3xl font-semibold text-maroon mb-2">
            Book an Appointment
          </h1>

          <p className="text-sm text-muted leading-relaxed">
            Schedule your consultation with our specialist.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="appointmentDate"
                className="block text-xs font-semibold text-ink mb-2"
              >
                Preferred Date
              </label>

              <div className="relative">
                <input
                  id="appointmentDate"
                  name="appointmentDate"
                  type="date"
                  min={getToday()}
                  value={formData.appointmentDate}
                  onChange={handleDateChange}
                  required
                  className="w-full bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl px-4 py-3 text-sm text-ink outline-none transition-colors"
                />

                <CalendarDays
                  size={17}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="timeSlot"
                className="block text-xs font-semibold text-ink mb-2"
              >
                Preferred Time
              </label>

              <div className="relative">
                <select
                  id="timeSlot"
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={handleTimeChange}
                  required
                  disabled={
                    !formData.appointmentDate ||
                    isLoadingSlots
                  }
                  className="w-full appearance-none bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl px-4 py-3 text-sm text-ink outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.appointmentDate
                      ? 'Select a date first'
                      : isLoadingSlots
                        ? 'Loading...'
                        : 'Select a time'}
                  </option>

                  {availableSlots.map(
                    ({ slot, booked, past }) => (
                      <option
                        key={slot}
                        value={slot}
                        disabled={booked || past}
                      >
                        {slot}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <h2 className="text-lg font-semibold text-maroon mb-5">
              Patient Details
            </h2>

            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold text-ink mb-2"
                  >
                    Name
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Jane Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="w-full bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-xs font-semibold text-ink mb-2"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    maxLength={25}
                    autoComplete="tel"
                    className="w-full bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-ink mb-2"
                >
                  Email {' '}
                   <span className="font-normal text-muted">
                    (Optional)  
                  </span>
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={254}
                  autoComplete="email"
                  className="w-full bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {message && (
            <div
              role="alert"
              className={`rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                isSuccess
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoadingSlots
            }
            className="w-full inline-flex items-center justify-center gap-2 bg-maroon hover:bg-maroon-dark text-white text-sm font-semibold px-5 py-3.5 rounded-full transition-all duration-300 hover:scale-[1.01] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting
              ? 'Booking...'
              : 'Confirm Appointment'}

            {!isSubmitting && (
              <ArrowRight
                size={17}
                strokeWidth={2}
              />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}