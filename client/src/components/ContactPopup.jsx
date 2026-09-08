import { useEffect, useState } from 'react';
import {
  X,
  Phone,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';

import { CLINIC } from '../utils/constants';
import api from '../services/api';

function getClinicStatus() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: CLINIC.timezone,
    hour: 'numeric',
    hour12: false,
    weekday: 'long',
  }).formatToParts(new Date());

  const weekday = parts.find(
    ({ type }) => type === 'weekday'
  )?.value;

  const hour = Number(
    parts.find(({ type }) => type === 'hour')?.value
  );

  if (weekday === 'Sunday') {
    return false;
  }

  return (
    hour >= CLINIC.openingTime &&
    hour < CLINIC.closingTime
  );
}

function isValidIndianPhone(phone) {
  const cleanedPhone = phone.replace(/[\s-]/g, '');

  return /^(?:\+91|91)?[6-9]\d{9}$/.test(cleanedPhone);
}

export default function ContactPopup({ onClose }) {
  const [isClinicOpen, setIsClinicOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsClinicOpen(getClinicStatus());
    };

    updateStatus();

    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(CLINIC.phone);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setMessage('Unable to copy the number.');
      setIsSuccess(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setIsSuccess(false);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setMessage('Please enter your name.');
      return;
    }

    if (!trimmedPhone) {
      setMessage('Please enter your phone number.');
      return;
    }

    if (!isValidIndianPhone(trimmedPhone)) {
      setMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/contact/callback', {
        name: trimmedName,
        phone: trimmedPhone,
      });

      setIsSuccess(true);

      setMessage(
        response.data?.message ||
          'Your callback request has been received.'
      );

      setName('');
      setPhone('');
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Unable to submit your request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-popup-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F3F3] text-[#4F172D] transition hover:bg-[#FFECF0]"
        >
          <X size={18} />
        </button>

        <div className="px-6 py-7 sm:px-8 sm:py-8">
          <div className="pr-10">
            <h2
              id="contact-popup-title"
              className="text-xl font-semibold text-ink"
            >
              {isClinicOpen
                ? 'Contact the Clinic'
                : 'Request a Callback'}
            </h2>
          </div>

          <div
            className={`mt-5 flex items-center gap-3 rounded-xl px-4 py-3 ${
              isClinicOpen ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink">
              <Clock size={16} />
            </div>

            <div>
              <p className="text-xs font-semibold text-ink">
                {isClinicOpen
                  ? 'Clinic is Open'
                  : 'Clinic is Closed'}
              </p>

              <p className="text-xs text-muted">
                {CLINIC.workingHours}
              </p>

              {!isClinicOpen && (
                <p className="text-xs text-muted">
                  {CLINIC.hoursNote}
                </p>
              )}
            </div>
          </div>

          {isClinicOpen && (
            <div className="mt-5 space-y-3">
              <a
                href={CLINIC.phoneHref}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F172D] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#3F1224]"
              >
                <Phone size={17} />
                Call Clinic
              </a>

              <button
                type="button"
                onClick={handleCopyNumber}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7E1E3] bg-white px-5 py-3.5 text-sm font-medium text-[#4F172D] transition hover:bg-[#FBF9F9]"
              >
                {copied ? (
                  <>
                    <Check size={17} />
                    Number Copied
                  </>
                ) : (
                  <>
                    <Copy size={17} />
                    Copy Number
                  </>
                )}
              </button>
            </div>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E7E1E3]" />

            <span className="text-center text-[11px] text-muted">
              Can&apos;t connect? Leave your number and we&apos;ll call you back.
            </span>

            <div className="h-px flex-1 bg-[#E7E1E3]" />
          </div>

          {message && (
            <div
              role="alert"
              className={`rounded-xl border px-4 py-3 text-xs ${
                isSuccess
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {message}
            </div>
          )}

          <form
            className="mt-5 space-y-4"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="callback-name"
                className="mb-1.5 block text-xs font-medium text-ink"
              >
                Name
              </label>

              <input
                id="callback-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                maxLength={80}
                autoComplete="name"
                className="w-full rounded-xl border border-[#E7E1E3] px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-[#4F172D] focus:ring-1 focus:ring-[#4F172D]"
              />
            </div>

            <div>
              <label
                htmlFor="callback-phone"
                className="mb-1.5 block text-xs font-medium text-ink"
              >
                Phone Number
              </label>

              <input
                id="callback-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter your 10-digit mobile number"
                maxLength={15}
                autoComplete="tel"
                inputMode="numeric"
                className="w-full rounded-xl border border-[#E7E1E3] px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-[#4F172D] focus:ring-1 focus:ring-[#4F172D]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F172D] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#3F1224] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Sending...
                </>
              ) : (
                <>
                  Request a Callback
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}