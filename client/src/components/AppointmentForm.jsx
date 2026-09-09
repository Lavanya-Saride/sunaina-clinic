import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CLINIC, SITE_CONTENT, TIME_SLOTS } from '../utils/constants';
import { getBookedSlots, submitAppointment } from '../services/appointmentService';

const EMPTY_FORM = { appointmentDate: '', timeSlot: '', fullName: '', phoneNumber: '', email: '' };

function getToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const year = parts.find(({ type }) => type === 'year')?.value;
  const month = parts.find(({ type }) => type === 'month')?.value;
  const day = parts.find(({ type }) => type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function isPastTimeSlot(slot) {
  const parts = slot.split(' ');
  if (parts.length !== 2) return false;
  const [time, period] = parts;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || !['AM', 'PM'].includes(period)) return false;

  let hour = hours;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const partsNow = new Intl.DateTimeFormat('en-IN', { timeZone: CLINIC.timezone, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
  const currentHour = Number(partsNow.find(({ type }) => type === 'hour')?.value);
  const currentMinute = Number(partsNow.find(({ type }) => type === 'minute')?.value);
  return hour * 60 + minutes <= currentHour * 60 + currentMinute;
}

export default function AppointmentForm() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { appointment } = SITE_CONTENT;
  const isToday = formData.appointmentDate === getToday();

  const availableSlots = useMemo(() => TIME_SLOTS.map((slot) => ({ slot, booked: bookedSlots.includes(slot), past: isToday && isPastTimeSlot(slot) })), [bookedSlots, isToday]);

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
        const slots = await getBookedSlots(formData.appointmentDate);
        if (!isMounted) return;
        setBookedSlots(Array.isArray(slots) ? slots.filter((slot) => TIME_SLOTS.includes(slot)) : []);
      } catch {
        if (isMounted) setBookedSlots([]);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }

    loadBookedSlots();
    return () => { isMounted = false; };
  }, [formData.appointmentDate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setMessage('');
    setIsSuccess(false);
  };

  const handleDateChange = (event) => {
    setFormData((current) => ({ ...current, appointmentDate: event.target.value, timeSlot: '' }));
    setBookedSlots([]);
    setMessage('');
    setIsSuccess(false);
  };

  const handleTimeChange = (event) => {
    const time = event.target.value;
    if (bookedSlots.includes(time) || (isToday && isPastTimeSlot(time))) return;
    setFormData((current) => ({ ...current, timeSlot: time }));
    setMessage('');
    setIsSuccess(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.appointmentDate) { setIsSuccess(false); setMessage(appointment.dateError); return; }
    if (!formData.timeSlot) { setIsSuccess(false); setMessage(appointment.timeError); return; }
    if (bookedSlots.includes(formData.timeSlot) || (isToday && isPastTimeSlot(formData.timeSlot))) {
      setFormData((current) => ({ ...current, timeSlot: '' }));
      return;
    }
    if (isLoadingSlots) return;

    setIsSubmitting(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await submitAppointment({ appointmentDate: formData.appointmentDate, timeSlot: formData.timeSlot, fullName: formData.fullName.trim(), phoneNumber: formData.phoneNumber.trim(), email: formData.email.trim() });
      setIsSuccess(true);
      setMessage(response?.message || appointment.success);
      setFormData(EMPTY_FORM);
      setBookedSlots([]);
    } catch (error) {
      if (error?.response?.status === 409) {
        const attemptedSlot = formData.timeSlot;
        setBookedSlots((current) => current.includes(attemptedSlot) ? current : [...current, attemptedSlot]);
        setFormData((current) => ({ ...current, timeSlot: '' }));
        setMessage(appointment.conflict);
        return;
      }
      setIsSuccess(false);
      setMessage(error?.response?.data?.message || appointment.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 xs:px-5 sm:px-7">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-[clamp(0.7rem,1.6vw,0.75rem)] font-semibold text-maroon hover:underline"><ArrowLeft size={15} />{appointment.back}</Link>
      <div className="w-full rounded-3xl border border-line bg-white p-4 shadow-card xs:p-6 sm:p-8 lg:p-10">
        <div className="mb-7 sm:mb-8">
          <p className="mb-2 text-[clamp(0.6rem,1.5vw,0.75rem)] font-semibold uppercase tracking-[0.12em] text-maroon">{appointment.eyebrow}</p>
          <h1 className="mb-2 text-[clamp(1.5rem,5vw,1.875rem)] font-semibold leading-tight text-maroon">{appointment.title}</h1>
          <p className="text-[clamp(0.75rem,1.8vw,0.875rem)] leading-relaxed text-muted">{appointment.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="appointmentDate" className="mb-2 block text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-ink">{appointment.preferredDate}</label>
              <div className="relative">
                <input id="appointmentDate" name="appointmentDate" type="date" min={getToday()} value={formData.appointmentDate} onChange={handleDateChange} required className="w-full rounded-xl border border-transparent bg-[#f7f7f6] px-4 py-3 text-[clamp(0.8rem,2vw,0.875rem)] text-ink outline-none transition-colors focus:border-maroon" />
                <CalendarDays size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>
            <div>
              <label htmlFor="timeSlot" className="mb-2 block text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-ink">{appointment.preferredTime}</label>
              <div className="relative">
                <select id="timeSlot" name="timeSlot" value={formData.timeSlot} onChange={handleTimeChange} required disabled={!formData.appointmentDate || isLoadingSlots} className="w-full appearance-none rounded-xl border border-transparent bg-[#f7f7f6] px-4 py-3 pr-10 text-[clamp(0.8rem,2vw,0.875rem)] text-ink outline-none transition-colors focus:border-maroon disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="">{!formData.appointmentDate ? appointment.selectDateFirst : isLoadingSlots ? appointment.loading : appointment.selectTime}</option>
                  {availableSlots.map(({ slot, booked, past }) => <option key={slot} value={slot} disabled={booked || past}>{slot}</option>)}
                </select>
                <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-5 sm:pt-6">
            <h2 className="mb-5 text-[clamp(1rem,2.5vw,1.125rem)] font-semibold text-maroon">{appointment.patientDetails}</h2>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className="mb-2 block text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-ink">{appointment.name}</label>
                  <input id="fullName" name="fullName" type="text" placeholder={appointment.namePlaceholder} value={formData.fullName} onChange={handleChange} required maxLength={100} autoComplete="name" className="w-full rounded-xl border border-transparent bg-[#f7f7f6] px-4 py-3 text-[clamp(0.8rem,2vw,0.875rem)] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-maroon" />
                </div>
                <div>
                  <label htmlFor="phoneNumber" className="mb-2 block text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-ink">{appointment.phone}</label>
                  <input id="phoneNumber" name="phoneNumber" type="tel" placeholder={appointment.phonePlaceholder} value={formData.phoneNumber} onChange={handleChange} required maxLength={25} autoComplete="tel" inputMode="tel" className="w-full rounded-xl border border-transparent bg-[#f7f7f6] px-4 py-3 text-[clamp(0.8rem,2vw,0.875rem)] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-maroon" />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-ink">{appointment.email} <span className="font-normal text-muted">{appointment.optional}</span></label>
                <input id="email" name="email" type="email" placeholder={appointment.emailPlaceholder} value={formData.email} onChange={handleChange} maxLength={254} autoComplete="email" className="w-full rounded-xl border border-transparent bg-[#f7f7f6] px-4 py-3 text-[clamp(0.8rem,2vw,0.875rem)] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-maroon" />
              </div>
            </div>
          </div>

          {message && <div role="alert" className={`rounded-xl border px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] leading-relaxed ${isSuccess ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'}`}>{message}</div>}

          <button type="submit" disabled={isSubmitting || isLoadingSlots} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-5 text-[clamp(0.7rem,1.7vw,0.875rem)] font-semibold text-white transition-all duration-300 hover:scale-[1.01] hover:bg-maroon-dark hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100">
            {isSubmitting ? appointment.booking : appointment.confirm}
            {!isSubmitting && <ArrowRight size={17} strokeWidth={2} />}
          </button>
        </form>
      </div>
    </div>
  );
}
