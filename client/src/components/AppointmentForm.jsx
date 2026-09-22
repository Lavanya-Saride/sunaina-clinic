import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { SITE_CONTENT, TIME_SLOTS } from '../utils/constants';
import {
  createAppointmentOrder,
  getBookedSlots,
  verifyPayment,
} from '../services/appointmentService';

const CONSULTATION_TYPES = ['offline', 'virtual'];

const PHONE_REGEX =
  /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WEEK_DAYS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getIndianTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }
  ).formatToParts(now);

  const values = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getInitialConsultationType(location) {
  const queryType =
    new URLSearchParams(
      location.search
    ).get('type');

  if (queryType === 'virtual') {
    return 'virtual';
  }

  if (queryType === 'clinic') {
    return 'offline';
  }

  if (
    CONSULTATION_TYPES.includes(
      location.state?.consultationType
    )
  ) {
    return location.state.consultationType;
  }

  return 'offline';
}

function buildEmptyForm(
  consultationType
) {
  return {
    consultationType,
    appointmentDate: '',
    timeSlot: '',
    fullName: '',
    phoneNumber: '',
    email: '',
  };
}

function getToday() {
  const now = getIndianTime();

  return [
    now.year,
    String(now.month).padStart(2, '0'),
    String(now.day).padStart(2, '0'),
  ].join('-');
}

function parseDate(dateString) {
  if (!dateString) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDateForInput(date) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0'),
  ].join('-');
}

function formatDateForDisplay(
  dateString
) {
  const date = parseDate(dateString);

  if (!date) {
    return '';
  }

  return [
    String(date.getDate()).padStart(
      2,
      '0'
    ),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    date.getFullYear(),
  ].join('-');
}

function isSundayDate(dateString) {
  const date = parseDate(dateString);

  return date
    ? date.getDay() === 0
    : false;
}

function isPastTimeSlot(slot) {
  if (!slot) {
    return false;
  }

  const parts = slot.trim().split(/\s+/);

  if (parts.length !== 2) {
    return false;
  }

  const [time, period] = parts;

  const [
    hours,
    minutes,
  ] = time.split(':').map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return false;
  }

  let hour = hours;

  if (
    period.toUpperCase() === 'PM' &&
    hour !== 12
  ) {
    hour += 12;
  }

  if (
    period.toUpperCase() === 'AM' &&
    hour === 12
  ) {
    hour = 0;
  }

  const now = getIndianTime();

  const currentMinutes =
    now.hour * 60 +
    now.minute;

  const slotMinutes =
    hour * 60 +
    minutes;

  return slotMinutes <= currentMinutes;
}

function getCalendarDays(
  monthDate
) {
  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const previousMonthDays =
    new Date(
      year,
      month,
      0
    ).getDate();

  const days = [];

  for (
    let index = firstDay - 1;
    index >= 0;
    index -= 1
  ) {
    days.push({
      date: new Date(
        year,
        month - 1,
        previousMonthDays -
          index
      ),
      currentMonth: false,
    });
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    days.push({
      date: new Date(
        year,
        month,
        day
      ),
      currentMonth: true,
    });
  }

  let nextDay = 1;

  while (days.length < 42) {
    days.push({
      date: new Date(
        year,
        month + 1,
        nextDay
      ),
      currentMonth: false,
    });

    nextDay += 1;
  }

  return days;
}

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve(
      window.Razorpay
    );
  }

  return new Promise(
    (resolve, reject) => {
      const existing =
        document.querySelector(
          'script[data-razorpay-checkout]'
        );

      if (existing) {
        existing.addEventListener(
          'load',
          () =>
            resolve(
              window.Razorpay
            )
        );

        existing.addEventListener(
          'error',
          () =>
            reject(
              new Error(
                'Unable to load payment service.'
              )
            )
        );

        return;
      }

      const script =
        document.createElement(
          'script'
        );

      script.src =
        'https://checkout.razorpay.com/v1/checkout.js';

      script.async = true;

      script.dataset.razorpayCheckout =
        'true';

      script.onload = () =>
        resolve(
          window.Razorpay
        );

      script.onerror = () =>
        reject(
          new Error(
            'Unable to load payment service.'
          )
        );

      document.body.appendChild(
        script
      );
    }
  );
}

export default function AppointmentForm() {
  const location = useLocation();

  const [formData, setFormData] =
    useState(() =>
      buildEmptyForm(
        getInitialConsultationType(
          location
        )
      )
    );

  const [bookedSlots, setBookedSlots] =
    useState([]);

  const [
    isLoadingSlots,
    setIsLoadingSlots,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [message, setMessage] =
    useState('');

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [
    confirmation,
    setConfirmation,
  ] = useState(null);

  const [
    isCalendarOpen,
    setIsCalendarOpen,
  ] = useState(false);

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(() => {
    const now = getIndianTime();

    return new Date(
      now.year,
      now.month - 1,
      1
    );
  });

  const calendarRef = useRef(null);

  const appointment =
    SITE_CONTENT?.appointment || {};

  const todayString = getToday();

  const isToday =
    formData.appointmentDate ===
    todayString;

  const availableSlots = useMemo(
    () =>
      TIME_SLOTS.map((slot) => ({
        slot,
        booked:
          bookedSlots.includes(slot),
        past:
          isToday &&
          isPastTimeSlot(slot),
      })),
    [
      bookedSlots,
      isToday,
    ]
  );

  useEffect(() => {
    if (
      formData.appointmentDate ===
        todayString &&
      formData.timeSlot &&
      isPastTimeSlot(
        formData.timeSlot
      )
    ) {
      setFormData((current) => ({
        ...current,
        timeSlot: '',
      }));
    }
  }, [
    todayString,
    formData.appointmentDate,
    formData.timeSlot,
  ]);

  const calendarDays = useMemo(
    () =>
      getCalendarDays(
        calendarMonth
      ),
    [calendarMonth]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadBookedSlots() {
      if (
        !formData.appointmentDate ||
        isSundayDate(
          formData.appointmentDate
        )
      ) {
        setBookedSlots([]);
        setIsLoadingSlots(false);
        return;
      }

      setIsLoadingSlots(true);
      setBookedSlots([]);

      try {
        const slots =
          await getBookedSlots(
            formData.appointmentDate
          );

        if (!isMounted) {
          return;
        }

        setBookedSlots(
          Array.isArray(slots)
            ? slots.filter((slot) =>
                TIME_SLOTS.includes(
                  slot
                )
              )
            : []
        );
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
  }, [
    formData.appointmentDate,
  ]);

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(
          event.target
        )
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage('');
    setIsSuccess(false);
    setConfirmation(null);
  };

  const handleDateSelect = (date) => {
    const selectedDate =
      formatDateForInput(date);

    if (
      selectedDate < todayString ||
      date.getDay() === 0
    ) {
      return;
    }

    setFormData((current) => ({
      ...current,
      appointmentDate:
        selectedDate,
      timeSlot: '',
    }));

    setBookedSlots([]);
    setMessage('');
    setIsSuccess(false);
    setConfirmation(null);
    setIsCalendarOpen(false);
  };

  const handleCalendarPrevious =
    () => {
      const now = getIndianTime();

      const currentMonth =
        new Date(
          now.year,
          now.month - 1,
          1
        );

      const previousMonth =
        new Date(
          calendarMonth.getFullYear(),
          calendarMonth.getMonth() - 1,
          1
        );

      if (
        previousMonth < currentMonth
      ) {
        return;
      }

      setCalendarMonth(
        previousMonth
      );
    };

  const handleCalendarNext = () => {
    setCalendarMonth(
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        1
      )
    );
  };

  const handleTimeChange = (event) => {
    const time =
      event.target.value;

    if (
      bookedSlots.includes(time) ||
      (
        isToday &&
        isPastTimeSlot(time)
      )
    ) {
      return;
    }

    setFormData((current) => ({
      ...current,
      timeSlot: time,
    }));

    setMessage('');
    setIsSuccess(false);
    setConfirmation(null);
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.appointmentDate ||
      isSundayDate(
        formData.appointmentDate
      )
    ) {
      setIsSuccess(false);
      setMessage(
        appointment.dateError ||
          'Please select an available working day.'
      );
      return;
    }

    if (!formData.timeSlot) {
      setIsSuccess(false);
      setMessage(
        appointment.timeError ||
          'Please select an appointment time.'
      );
      return;
    }

    if (
      bookedSlots.includes(
        formData.timeSlot
      ) ||
      (
        isToday &&
        isPastTimeSlot(
          formData.timeSlot
        )
      )
    ) {
      setFormData((current) => ({
        ...current,
        timeSlot: '',
      }));

      setIsSuccess(false);
      setMessage(
        appointment.conflict ||
          'This slot is no longer available. Please select another slot.'
      );
      return;
    }

    if (
      !CONSULTATION_TYPES.includes(
        formData.consultationType
      )
    ) {
      setIsSuccess(false);
      setMessage(
        appointment.genericError ||
          'Please select a valid consultation type.'
      );
      return;
    }

    const name =
      formData.fullName.trim();

    const phone =
      formData.phoneNumber
        .trim()
        .replace(/[\s-]/g, '');

    const email =
      formData.email
        .trim()
        .toLowerCase();

    if (
      name.length < 2 ||
      name.length > 100
    ) {
      setIsSuccess(false);
      setMessage(
        appointment.nameError ||
          'Please enter a valid name.'
      );
      return;
    }

    if (!PHONE_REGEX.test(phone)) {
      setIsSuccess(false);
      setMessage(
        appointment.phoneError ||
          'Please enter a valid phone number.'
      );
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setIsSuccess(false);
      setMessage(
        appointment.emailError ||
          'Please enter a valid email address.'
      );
      return;
    }

    if (
      isLoadingSlots ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setIsSuccess(false);
    setConfirmation(null);

    try {
      const response =
        await createAppointmentOrder({
          appointmentDate:
            formData.appointmentDate,
          timeSlot:
            formData.timeSlot,
          consultationType:
            formData.consultationType,
          fullName: name,
          phoneNumber:
            formData.phoneNumber.trim(),
          email,
        });

      const order = response?.data;

      if (
        !order?.orderId ||
        !order?.keyId ||
        !order?.appointmentId
      ) {
        throw new Error(
          appointment.paymentError ||
            'Unable to start payment.'
        );
      }

      const Razorpay =
        await loadRazorpay();

      const consultationLabel =
        formData.consultationType ===
        'virtual'
          ? 'Virtual Consultation'
          : 'Clinic Consultation';

      const razorpay =
        new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency:
            order.currency,
          name:
            'Sunaina Clinic',
          description:
            consultationLabel,
          order_id:
            order.orderId,
          prefill: {
            name,
            email,
            contact:
              formData.phoneNumber.trim(),
          },
          notes: {
            appointmentId:
              order.appointmentId,
          },
          theme: {
            color: '#4F172D',
          },
          handler:
            async (
              paymentResponse
            ) => {
              try {
                const verified =
                  await verifyPayment({
                    appointmentId:
                      order.appointmentId,
                    razorpay_order_id:
                      paymentResponse.razorpay_order_id,
                    razorpay_payment_id:
                      paymentResponse.razorpay_payment_id,
                    razorpay_signature:
                      paymentResponse.razorpay_signature,
                  });

                setIsSuccess(true);

                setMessage(
                  verified?.message ||
                    appointment.success ||
                    'Appointment successfully booked.'
                );

                setConfirmation(
                  verified?.data ||
                    null
                );

                setBookedSlots(
                  (current) =>
                    current.includes(
                      order.timeSlot
                    )
                      ? current
                      : [
                          ...current,
                          order.timeSlot,
                        ]
                );

                setFormData(
                  buildEmptyForm(
                    formData.consultationType
                  )
                );
              } catch (error) {
                setIsSuccess(false);

                setMessage(
                  error?.response
                    ?.data?.message ||
                    appointment.paymentVerificationError ||
                    'Payment verification failed. Please contact us if the amount was deducted.'
                );
              } finally {
                setIsSubmitting(false);
              }
            },
        });

      razorpay.on(
        'payment.failed',
        () => {
          setIsSubmitting(false);
          setIsSuccess(false);
          setMessage(
            appointment.paymentFailed ||
              'Payment failed. Please try again.'
          );
        }
      );

      razorpay.open();
    } catch (error) {
      if (
        error?.response?.status ===
        409
      ) {
        setBookedSlots(
          (current) =>
            current.includes(
              formData.timeSlot
            )
              ? current
              : [
                  ...current,
                  formData.timeSlot,
                ]
        );

        setFormData((current) => ({
          ...current,
          timeSlot: '',
        }));

        setMessage(
          appointment.conflict ||
            'This slot is no longer available. Please select another slot.'
        );
      } else {
        setIsSuccess(false);

        setMessage(
          error?.response?.data
            ?.message ||
            error.message ||
            appointment.genericError ||
            'Something went wrong. Please try again.'
        );
      }

      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 xs:px-5 sm:px-7">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 text-[clamp(0.7rem,1.6vw,0.75rem)] font-semibold text-maroon hover:underline"
      >
        <ArrowLeft
          size={15}
          aria-hidden="true"
        />
        Back to Home
      </Link>

      <div className="w-full rounded-3xl border border-line bg-white p-4 shadow-card xs:p-5 sm:p-8 lg:p-10">
        <div className="mb-7 text-center sm:mb-8">
          <h1 className="text-[clamp(1.35rem,4vw,1.5rem)] font-semibold leading-tight text-maroon">
            {appointment.title ||
              'Book an Appointment'}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 sm:space-y-6"
        >
          <input
            type="hidden"
            name="consultationType"
            value={
              formData.consultationType
            }
          />

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            <div className="min-w-0">
              <label
                htmlFor="appointmentDate"
                className="mb-2 block text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold uppercase tracking-wide text-ink/80"
              >
                {appointment.preferredDate ||
                  'Preferred Date'}
              </label>

              <div
                ref={calendarRef}
                className="relative"
              >
                <button
                  type="button"
                  id="appointmentDate"
                  onClick={() =>
                    setIsCalendarOpen(
                      (current) =>
                        !current
                    )
                  }
                  className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-line bg-cream/60 px-3.5 py-3 text-left text-[clamp(0.8rem,2vw,0.875rem)] leading-relaxed text-ink outline-none transition-colors hover:bg-white focus:border-maroon focus:outline-none focus:ring-0"
                >
                  <span
                    className={
                      formData.appointmentDate
                        ? 'text-ink'
                        : 'text-muted'
                    }
                  >
                    {formData.appointmentDate
                      ? formatDateForDisplay(
                          formData.appointmentDate
                        )
                      : 'dd-mm-yyyy'}
                  </span>

                  <CalendarDays
                    size={17}
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </button>

                {isCalendarOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-line bg-white p-4 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={
                          handleCalendarPrevious
                        }
                        disabled={(() => {
                          const now =
                            getIndianTime();

                          return (
                            calendarMonth.getFullYear() ===
                              now.year &&
                            calendarMonth.getMonth() ===
                              now.month - 1
                          );
                        })()}
                        aria-label="Previous month"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink outline-none transition-colors hover:bg-blush focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronLeft
                          size={17}
                        />
                      </button>

                      <p className="text-sm font-semibold text-maroon">
                        {
                          MONTHS[
                            calendarMonth.getMonth()
                          ]
                        }{' '}
                        {calendarMonth.getFullYear()}
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleCalendarNext
                        }
                        aria-label="Next month"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink outline-none transition-colors hover:bg-blush focus:outline-none focus:ring-0"
                      >
                        <ChevronRight
                          size={17}
                        />
                      </button>
                    </div>

                    <div className="mb-2 grid grid-cols-7 gap-1">
                      {WEEK_DAYS.map(
                        (day) => (
                          <span
                            key={day}
                            className={`py-1 text-center text-[10px] font-semibold ${
                              day === 'Sun'
                                ? 'text-muted/40'
                                : 'text-muted'
                            }`}
                          >
                            {day}
                          </span>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map(
                        ({
                          date,
                          currentMonth,
                        }) => {
                          const dateValue =
                            formatDateForInput(
                              date
                            );

                          const isSunday =
                            date.getDay() ===
                            0;

                          const isPast =
                            dateValue <
                            todayString;

                          const disabled =
                            !currentMonth ||
                            isSunday ||
                            isPast;

                          const selected =
                            formData.appointmentDate ===
                            dateValue;

                          const today =
                            dateValue ===
                            todayString;

                          return (
                            <button
                              key={
                                dateValue
                              }
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                handleDateSelect(
                                  date
                                )
                              }
                              className={`flex h-8 w-full items-center justify-center rounded-lg text-xs outline-none focus:outline-none focus:ring-0 ${
                                disabled
                                  ? isSunday
                                    ? 'cursor-not-allowed text-muted/25'
                                    : 'cursor-default text-muted/30'
                                  : 'text-ink hover:bg-blush'
                              } ${
                                selected
                                  ? 'bg-maroon font-semibold text-white hover:bg-maroon'
                                  : ''
                              } ${
                                today &&
                                !selected &&
                                !disabled
                                  ? 'font-semibold text-maroon'
                                  : ''
                              }`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="timeSlot"
                className="mb-2 block text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold uppercase tracking-wide text-ink/80"
              >
                {appointment.preferredTime ||
                  'Preferred Time'}
              </label>

              <div className="relative">
                <select
                  id="timeSlot"
                  name="timeSlot"
                  value={
                    formData.timeSlot
                  }
                  onChange={
                    handleTimeChange
                  }
                  required
                  disabled={
                    !formData.appointmentDate ||
                    isLoadingSlots ||
                    isSundayDate(
                      formData.appointmentDate
                    )
                  }
                  className="w-full min-w-0 appearance-none rounded-xl border border-line bg-cream/60 px-3.5 py-3 pr-10 text-[clamp(0.8rem,2vw,0.875rem)] leading-relaxed text-ink outline-none transition-colors focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {!formData.appointmentDate
                      ? appointment.selectDateFirst ||
                        'Select a date first'
                      : isLoadingSlots
                        ? appointment.loading ||
                          'Loading...'
                        : appointment.selectTime ||
                          'Select a time'}
                  </option>

                  {availableSlots.map(
                    ({
                      slot,
                      booked,
                      past,
                    }) => (
                      <option
                        key={slot}
                        value={slot}
                        disabled={
                          booked ||
                          past
                        }
                      >
                        {slot}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-5 sm:pt-6">
            <h2 className="mb-5 text-[clamp(1rem,2.5vw,1.125rem)] font-semibold text-maroon">
              {appointment.patientDetails ||
                'Patient Details'}
            </h2>

            <div className="space-y-5 sm:space-y-6">
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                <div className="min-w-0">
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold uppercase tracking-wide text-ink/80"
                  >
                    {appointment.name ||
                      'Full Name'}
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder={
                      appointment.namePlaceholder ||
                      'Enter your full name'
                    }
                    value={
                      formData.fullName
                    }
                    onChange={
                      handleChange
                    }
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="w-full min-w-0 rounded-xl border border-line bg-cream/60 px-3.5 py-3 text-[clamp(0.8rem,2vw,0.875rem)] leading-relaxed text-ink placeholder:text-muted focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30"
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="phoneNumber"
                    className="mb-2 block text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold uppercase tracking-wide text-ink/80"
                  >
                    {appointment.phone ||
                      'Phone Number'}
                  </label>

                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="98765 43210"
                    value={
                      formData.phoneNumber
                    }
                    onChange={
                      handleChange
                    }
                    required
                    maxLength={25}
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full min-w-0 rounded-xl border border-line bg-cream/60 px-3.5 py-3 text-[clamp(0.8rem,2vw,0.875rem)] leading-relaxed text-ink placeholder:text-muted focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="email"
                  className="mb-2 block text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold uppercase tracking-wide text-ink/80"
                >
                  {appointment.email ||
                    'Email Address'}
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={
                    appointment.emailPlaceholder ||
                    'Enter your email address'
                  }
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  required
                  maxLength={254}
                  autoComplete="email"
                  className="w-full min-w-0 rounded-xl border border-line bg-cream/60 px-3.5 py-3 text-[clamp(0.8rem,2vw,0.875rem)] leading-relaxed text-ink placeholder:text-muted focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30"
                />
              </div>
            </div>
          </div>

          {message && (
            <div
              role="alert"
              className={`rounded-xl border px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] leading-relaxed ${
                isSuccess
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {message}
            </div>
          )}

          {confirmation && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-[clamp(0.7rem,1.6vw,0.8rem)] leading-relaxed text-green-800">
              <p>
                <strong>
                  {appointment.confirmationId ||
                    'Appointment ID'}
                  :
                </strong>{' '}
                {confirmation.appointmentNumber ||
                  confirmation.appointmentId}
              </p>

              {confirmation.consultationType ===
                'virtual' &&
                confirmation.meetUrl && (
                  <p className="mt-1">
                    <a
                      href={
                        confirmation.meetUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline"
                    >
                      {appointment.joinConsultation ||
                        'Join Virtual Consultation'}
                    </a>
                  </p>
                )}

              <p className="mt-1">
                {appointment.confirmationEmail ||
                  'Confirmation details have been sent to your email.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoadingSlots
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-6 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60 sm:px-8"
          >
            {isSubmitting
              ? appointment.paymentProcessing ||
                'Processing...'
              : appointment.submit ||
                'Book an Appointment'}

            {!isSubmitting && (
              <ArrowRight
                size={15}
                aria-hidden="true"
              />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}