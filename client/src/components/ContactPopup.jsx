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

import {
  CLINIC,
  SITE_CONTENT,
} from '../utils/constants';

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
    parts.find(
      ({ type }) => type === 'hour'
    )?.value
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

  return /^(?:\+91|91)?[6-9]\d{9}$/.test(
    cleanedPhone
  );
}

export default function ContactPopup({
  onClose,
}) {
  const [isClinicOpen, setIsClinicOpen] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [name, setName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [showCallError, setShowCallError] =
    useState(false);

  const { contact } = SITE_CONTENT;

  useEffect(() => {
    const updateStatus = () => {
      setIsClinicOpen(
        getClinicStatus()
      );
    };

    updateStatus();

    const interval = setInterval(
      updateStatus,
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (showCallError) {
        setShowCallError(false);
        return;
      }

      onClose();
    };

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [onClose, showCallError]);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(
        CLINIC.phone
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setMessage(
        contact.copyError
      );

      setIsSuccess(false);
    }
  };

  const handleCallClinic = () => {
    setShowCallError(false);

    const callLink =
      document.createElement('a');

    callLink.href =
      CLINIC.phoneHref;

    callLink.style.display = 'none';

    document.body.appendChild(
      callLink
    );

    callLink.click();

    document.body.removeChild(
      callLink
    );

    setTimeout(() => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        setShowCallError(true);
      }
    }, 1500);
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setMessage('');
    setIsSuccess(false);

    const trimmedName =
      name.trim();

    const trimmedPhone =
      phone.trim();

    if (!trimmedName) {
      setMessage(
        contact.emptyName
      );
      return;
    }

    if (!trimmedPhone) {
      setMessage(
        contact.emptyPhone
      );
      return;
    }

    if (
      !isValidIndianPhone(
        trimmedPhone
      )
    ) {
      setMessage(
        contact.invalidPhone
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await api.post(
          '/contact/callback',
          {
            name: trimmedName,
            phone: trimmedPhone,
          }
        );

      setIsSuccess(true);

      setMessage(
        response.data?.message ||
          contact.callbackSuccess
      );

      setName('');
      setPhone('');
      setShowCallError(false);
    } catch (error) {
      console.error(
        'CALLBACK SUBMISSION ERROR:',
        error
      );

      setIsSuccess(false);

      setMessage(
        error.response?.data?.message ||
          contact.callbackError
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4 sm:py-6"
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-popup-title"
          className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[92vh]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={contact.close}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F3F3] text-[#4F172D] transition hover:bg-[#FFECF0] sm:right-4 sm:top-4"
          >
            <X size={18} />
          </button>

          <div className="px-4 py-5 xs:px-5 xs:py-6 sm:px-8 sm:py-8">
            <div className="pr-10">
              <h2
                id="contact-popup-title"
                className="text-[clamp(1.1rem,4vw,1.25rem)] font-semibold leading-tight text-ink"
              >
                {isClinicOpen
                  ? contact.openTitle
                  : contact.closedTitle}
              </h2>
            </div>

            <div
              className={`mt-5 flex items-start gap-3 rounded-xl px-4 py-3 ${
                isClinicOpen
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink">
                <Clock size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-[clamp(0.7rem,1.8vw,0.75rem)] font-semibold text-ink">
                  {isClinicOpen
                    ? contact.openStatus
                    : contact.closedStatus}
                </p>

                <p className="break-words text-[clamp(0.65rem,1.7vw,0.75rem)] text-muted">
                  {CLINIC.workingHours}
                </p>

                {!isClinicOpen && (
                  <p className="text-[clamp(0.65rem,1.7vw,0.75rem)] text-muted">
                    {CLINIC.hoursNote}
                  </p>
                )}
              </div>
            </div>

            {isClinicOpen && (
              <>
                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={
                      handleCallClinic
                    }
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4F172D] px-4 py-3 text-[clamp(0.75rem,2vw,0.875rem)] font-medium text-white transition hover:bg-[#3F1224]"
                  >
                    <Phone size={17} />
                    {contact.call}
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleCopyNumber
                    }
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E7E1E3] bg-white px-4 py-3 text-[clamp(0.75rem,2vw,0.875rem)] font-medium text-[#4F172D] transition hover:bg-[#FBF9F9]"
                  >
                    {copied ? (
                      <>
                        <Check size={17} />
                        {contact.copied}
                      </>
                    ) : (
                      <>
                        <Copy size={17} />
                        {contact.copy}
                      </>
                    )}
                  </button>
                </div>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E7E1E3]" />

                  <span className="max-w-[75%] text-center text-[clamp(0.6rem,1.6vw,0.6875rem)] leading-relaxed text-muted">
                    {contact.divider}
                  </span>

                  <div className="h-px flex-1 bg-[#E7E1E3]" />
                </div>
              </>
            )}

            {message && (
              <div
                role="alert"
                className={`rounded-xl border px-4 py-3 text-[clamp(0.7rem,1.8vw,0.75rem)] leading-relaxed ${
                  isSuccess
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-600'
                }`}
              >
                {message}
              </div>
            )}

            <form
              className={`${
                message
                  ? 'mt-5'
                  : ''
              } space-y-4`}
              onSubmit={
                handleSubmit
              }
            >
              <div>
                <label
                  htmlFor="callback-name"
                  className="mb-1.5 block text-[clamp(0.7rem,1.8vw,0.75rem)] font-medium text-ink"
                >
                  {contact.name}
                </label>

                <input
                  id="callback-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder={
                    contact.namePlaceholder
                  }
                  maxLength={80}
                  autoComplete="name"
                  className="w-full rounded-xl border border-[#E7E1E3] px-4 py-3 text-[clamp(0.8rem,2vw,0.875rem)] text-ink outline-none placeholder:text-muted focus:border-[#4F172D] focus:ring-1 focus:ring-[#4F172D]"
                />
              </div>

              <div>
                <label
                  htmlFor="callback-phone"
                  className="mb-1.5 block text-[clamp(0.7rem,1.8vw,0.75rem)] font-medium text-ink"
                >
                  {contact.phone}
                </label>

                <input
                  id="callback-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder={
                    contact.phonePlaceholder
                  }
                  maxLength={15}
                  autoComplete="tel"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-[#E7E1E3] px-4 py-3 text-[clamp(0.8rem,2vw,0.875rem)] text-ink outline-none placeholder:text-muted focus:border-[#4F172D] focus:ring-1 focus:ring-[#4F172D]"
                />
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4F172D] px-4 py-3 text-[clamp(0.75rem,2vw,0.875rem)] font-medium text-white transition hover:bg-[#3F1224] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    {contact.sending}
                  </>
                ) : (
                  <>
                    {contact.request}
                    <ArrowRight
                      size={17}
                    />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {showCallError && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 px-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowCallError(
                false
              );
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="call-error-title"
            className="relative w-full max-w-xs rounded-xl bg-white px-5 py-5 shadow-2xl"
          >
            <button
              type="button"
              onClick={() =>
                setShowCallError(
                  false
                )
              }
              aria-label={contact.cancel}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#F5F3F3] text-ink transition hover:bg-[#FFECF0]"
            >
              <X size={15} />
            </button>

            <div className="pr-8">
              <p
                id="call-error-title"
                className="text-sm font-semibold text-ink"
              >
                {
                  contact.callErrorTitle
                }
              </p>

              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {
                  contact.callErrorDescription
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}