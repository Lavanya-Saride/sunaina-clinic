import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from '../FormField';
import { TIME_SLOTS } from '../../utils/constants';
import { getBookedSlots } from '../../services/appointmentService';
import { searchPatients } from '../../services/dashboardService';
import { getErrorMessage, getIndianToday } from '../../utils/dashboard';

const PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
  fullName: '',
  phoneNumber: '',
  email: '',
  consultationType: 'offline',
  appointmentDate: '',
  timeSlot: '',
  whatsappOptIn: false,

};

export default function OfflineAppointmentModal({ onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [lookup, setLookup] = useState('');
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (!form.appointmentDate) return undefined;
    let active = true;

    getBookedSlots(form.appointmentDate)
      .then((slots) => {
        if (!active) return;
        setBookedSlots(slots);
        setForm((current) =>
          slots.includes(current.timeSlot) ? { ...current, timeSlot: '' } : current
        );
      })
      .catch(() => active && setBookedSlots([]));

    return () => {
      active = false;
    };
  }, [form.appointmentDate]);

  useEffect(() => {
    const term = lookup.trim();
    if (term.length < 3) return undefined;
    let active = true;

    const timer = setTimeout(() => {
      searchPatients(term)
        .then((patients) => active && setMatches(patients))
        .catch(() => active && setMatches([]));
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [lookup]);

  const visibleMatches = lookup.trim().length >= 3 ? matches : [];

  const selectPatient = (patient) => {
    const digits = patient.whatsappNumber.replace(/\D/g, '');

    setForm((current) => ({
      ...current,
      fullName: patient.name,
      phoneNumber: digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits,
      email: patient.email || current.email,
      whatsappOptIn: patient.whatsappOptIn || current.whatsappOptIn,
    }));

    setLookup('');
    setMatches([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const phone = form.phoneNumber.trim().replace(/[\s-]/g, '');
    const email = form.email.trim();

    let problem = '';

    if (form.fullName.trim().length < 2) {
      problem = 'Please enter the patient name.';
    } else if (!PHONE_REGEX.test(phone)) {
      problem = 'Please enter a valid Indian phone number.';
    } else if (email && !EMAIL_REGEX.test(email)) {
      problem = 'Please enter a valid email address.';
    } else if (!form.appointmentDate) {
      problem = 'Please select the appointment date.';
    } else if (new Date(`${form.appointmentDate}T12:00:00+05:30`).getUTCDay() === 0) {
      problem = 'The clinic is closed on Sundays.';
    } else if (!form.timeSlot) {
      problem = 'Please select a time slot.';
    }

    if (problem) {
      setError(problem);
      return;
    }

    const payload = {
      appointmentDate: form.appointmentDate,
      timeSlot: form.timeSlot,
      consultationType: 'offline',
      fullName: form.fullName.trim(),
      phoneNumber: phone,
      whatsappOptIn: form.whatsappOptIn,
    };

    if (email) {
      payload.email = email;
    }


    setSubmitting(true);
    setError('');

    try {
      await onSubmit(payload);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  };

  const slotOptions = TIME_SLOTS.map((slot) => ({
    value: slot,
    label: bookedSlots.includes(slot) ? `${slot} (booked)` : slot,
    disabled: bookedSlots.includes(slot),
  }));

  return (
    <Modal title="New appointment" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="min-w-0">
          <FormField
            id="patient-lookup"
            label="Find existing patient"
            value={lookup}
            onChange={(event) => setLookup(event.target.value)}
            placeholder="Type name or phone (3+ characters)"
            required={false}
            autoComplete="off"
          />

          {visibleMatches.length > 0 && (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {visibleMatches.map((patient) => (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="flex min-h-11 w-full min-w-0 flex-col items-start px-3.5 py-2 text-left hover:bg-blush"
                  >
                    <span className="max-w-full break-words text-[clamp(0.78rem,1.8vw,0.85rem)] font-semibold text-ink">
                      {patient.name}
                    </span>
                    <span className="max-w-full break-all text-[0.72rem] text-muted">
                      {patient.whatsappNumber}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="offline-fullName"
            label="Patient name"
            value={form.fullName}
            onChange={set('fullName')}
            maxLength={100}
            autoComplete="off"
          />

          <FormField
            id="offline-phone"
            label="Phone / WhatsApp"
            type="tel"
            inputMode="tel"
            value={form.phoneNumber}
            onChange={set('phoneNumber')}
            maxLength={25}
            placeholder="98765 43210"
            autoComplete="off"
          />
        </div>

        <FormField
          id="offline-email"
          label="Email (optional)"
          type="email"
          value={form.email}
          onChange={set('email')}
          maxLength={254}
          required={false}
          autoComplete="off"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="offline-date"
            label="Date"
            type="date"
            min={getIndianToday()}
            value={form.appointmentDate}
            onChange={set('appointmentDate')}
          />

          <FormField
            id="offline-time"
            label="Time"
            type="select"
            placeholder={form.appointmentDate ? 'Choose a time slot' : 'Select a date first'}
            value={form.timeSlot}
            onChange={set('timeSlot')}
            options={slotOptions}
            disabled={!form.appointmentDate}
          />
        </div>



        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] leading-relaxed text-red-600"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-maroon px-5 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60 xs:order-2"
          >
            {submitting ? 'Saving...' : 'Save and confirm'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold text-ink transition-colors hover:bg-blush xs:order-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}