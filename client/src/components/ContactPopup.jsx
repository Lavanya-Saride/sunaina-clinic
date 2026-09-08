import { useEffect, useMemo, useState } from 'react';
import { Copy, Phone, X, User, CheckCircle2 } from 'lucide-react';
import { CLINIC } from '../utils/constants';
import api from '../services/api';

export default function ContactPopup({ onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isClinicOpen = useMemo(() => {
    const now = new Date();

    const indiaTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: CLINIC.timezone || 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'long',
    }).formatToParts(now);

    const parts = Object.fromEntries(
      indiaTime.map(({ type, value }) => [type, value])
    );

    const weekday = parts.weekday;
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);

    if (weekday === 'Sunday') {
      return false;
    }

    const currentMinutes = hour * 60 + minute;
    const openingMinutes = 10 * 60;
    const closingMinutes = 12 * 60;

    return (
      currentMinutes >= openingMinutes &&
      currentMinutes < closingMinutes
    );
  }, []);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(CLINIC.phone);
      setMessage('Phone number copied.');
    } catch {
      setMessage('Unable to copy the phone number.');
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

    setIsSubmitting(true);

    try {
      await api.post('/contact/callback', {
        name: trimmedName,
        phone: trimmedPhone,
      });

      setIsSuccess(true);
      setMessage(
        'Thank you. Our team will contact you.'
      );

      setName('');
      setPhone('');
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-dialog-title"
    >
      <button
        aria-label="Close contact dialog"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white border border-line shadow-2xl p-6 sm:p-7">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-blush text-maroon flex items-center justify-center hover:shadow-md transition-shadow"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-full bg-blush text-maroon flex items-center justify-center mb-4">
          <Phone size={20} />
        </div>

        <h2
          id="contact-dialog-title"
          className="text-xl font-semibold text-ink mb-2"
        >
          Contact Sunaina Clinic
        </h2>

        <p className="text-xs text-muted mb-5">
            Working hours: 10:00 AM - 7:00 PM (Mon - Sat)
        </p>

        {isClinicOpen ? (
          <>
            <div className="rounded-2xl bg-green-50 border border-green-200 p-4 mb-5">
              <p className="text-xs font-semibold text-green-700">
                Clinic is currently open
              </p>

              <p className="text-[11px] text-green-600 mt-1">
                You can call the clinic directly.
              </p>
            </div>

            <div className="rounded-2xl bg-cream border border-line p-4 mb-5">
              <p className="text-xs text-muted mb-1">
                Clinic phone
              </p>

              <p className="text-lg font-semibold text-maroon">
                {CLINIC.phone}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={CLINIC.phoneHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-maroon text-white px-4 py-3 text-sm font-semibold hover:shadow-lg transition-shadow"
              >
                <Phone size={16} />
                Call
              </a>

              <button
                type="button"
                onClick={copyNumber}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-maroon text-maroon px-4 py-3 text-sm font-semibold hover:bg-blush transition-colors"
              >
                <Copy size={16} />
                Copy Number
              </button>
            </div>

            {message && (
              <p className="text-xs text-muted text-center mt-4">
                {message}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-[#fff8f0] border border-[#f0dfc5] p-4 mb-5">
              <p className="text-xs font-semibold text-ink">
                The clinic is currently closed
              </p>

              <p className="text-[11px] text-muted mt-1 leading-relaxed">
                Leave your number and our team will
                contact you.
              </p>
            </div>

            {isSuccess ? (
              <div className="text-center py-5">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>

                <p className="text-sm font-semibold text-ink mb-1">
                  Request received
                </p>

                <p className="text-xs text-muted">
                  {message}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="callback-name"
                    className="block text-xs font-semibold text-ink mb-2"
                  >
                    Your Name
                  </label>

                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />

                    <input
                      id="callback-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your name"
                      maxLength={80}
                      autoComplete="name"
                      required
                      className="w-full bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl pl-10 pr-4 py-3 text-sm text-ink outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="callback-phone"
                    className="block text-xs font-semibold text-ink mb-2"
                  >
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />

                    <input
                      id="callback-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+91 98765 43210"
                      maxLength={25}
                      autoComplete="tel"
                      required
                      className="w-full bg-[#f7f7f6] border border-transparent focus:border-maroon rounded-xl pl-10 pr-4 py-3 text-sm text-ink outline-none transition-colors"
                    />
                  </div>
                </div>

                {message && !isSuccess && (
                  <div className="rounded-xl px-4 py-3 text-xs bg-red-50 text-red-600 border border-red-200">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-maroon text-white px-4 py-3 text-sm font-semibold hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-shadow"
                >
                  {isSubmitting
                    ? 'Sending...'
                    : 'Request a Callback'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}