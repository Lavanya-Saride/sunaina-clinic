import { useState } from 'react';
import { CalendarDays, Clock, Mail, Phone, RefreshCw, Video } from 'lucide-react';
import StatusBadge from './StatusBadge';
import {
  PAYMENT_METHOD_OPTIONS,
  STATUS_TABS,
  STATUS_TONES,
  formatDate,
  formatDateTime,
  canRetryAutomation,
  isAwaitingAttendance,
} from '../../utils/dashboard';

const primaryButton =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60';
const outlineButton =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-ink transition-colors hover:bg-blush disabled:cursor-not-allowed disabled:opacity-60';

const STATUS_LABELS = Object.fromEntries(STATUS_TABS.map((tab) => [tab.value, tab.label.split(' /')[0]]));

const CONFIRM_COPY = {
  COMPLETED: { prompt: 'Mark this visit as completed? A feedback request will be sent.', yes: 'Yes, completed' },
  ABSENT: { prompt: 'Mark the patient as absent? No feedback will be requested.', yes: 'Yes, absent' },
  CANCEL: { prompt: 'Cancel this appointment? The time slot will be released.', yes: 'Yes, cancel' },
};

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
        <Icon size={13} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[clamp(0.78rem,1.8vw,0.85rem)] font-medium text-ink">{children}</dd>
    </div>
  );
}

export default function AppointmentCard({ appointment, can, busy, onConfirmPayment, onAttendance, onCancel, onRetry }) {
  const [pendingAction, setPendingAction] = useState(null);
  const paymentMethod = PAYMENT_METHOD_OPTIONS.find((option) => option.value === appointment.paymentMethod)?.label || appointment.paymentMethod;
  const awaiting = isAwaitingAttendance(appointment);
  const failed = canRetryAutomation(appointment);
  const phoneHref = `tel:${appointment.phoneNumber.replace(/[^\d+]/g, '')}`;

  const runPending = async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'CANCEL') {
      await onCancel(appointment);
    } else {
      await onAttendance(appointment, action);
    }
  };

  const renderActions = () => {
    if (pendingAction) {
      const copy = CONFIRM_COPY[pendingAction];
      return (
        <div className="space-y-3">
          <p className="text-[clamp(0.72rem,1.7vw,0.8rem)] leading-relaxed text-ink">{copy.prompt}</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={runPending} disabled={busy} className={primaryButton}>{copy.yes}</button>
            <button type="button" onClick={() => setPendingAction(null)} disabled={busy} className={outlineButton}>Go back</button>
          </div>
        </div>
      );
    }

    if (appointment.status === 'PENDING_PAYMENT' && (can('payments:confirm') || can('appointments:cancel'))) {
      return (
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          {can('payments:confirm') && (
            <button type="button" onClick={() => onConfirmPayment(appointment)} disabled={busy} className={primaryButton}>Confirm payment</button>
          )}
          {can('appointments:cancel') && (
            <button type="button" onClick={() => setPendingAction('CANCEL')} disabled={busy} className={outlineButton}>Cancel</button>
          )}
        </div>
      );
    }

    if (appointment.status === 'CONFIRMED') {
      return (
        <div className="space-y-3">
          {can('attendance:mark') && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPendingAction('COMPLETED')} disabled={busy} className={primaryButton}>Completed</button>
              <button type="button" onClick={() => setPendingAction('ABSENT')} disabled={busy} className={outlineButton}>Absent</button>
            </div>
          )}
          {can('appointments:cancel') && (
            <button type="button" onClick={() => setPendingAction('CANCEL')} disabled={busy} className="min-h-11 w-full text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-muted underline-offset-2 hover:text-maroon hover:underline">
              Cancel appointment
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  const actions = renderActions();

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-card xs:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-[clamp(0.95rem,2.4vw,1.05rem)] font-semibold leading-snug text-ink">{appointment.fullName}</h3>
          <p className="mt-0.5 break-all text-[0.7rem] text-muted">{appointment.appointmentNumber}</p>
        </div>
        <StatusBadge tone={STATUS_TONES[appointment.status]}>{STATUS_LABELS[appointment.status]}</StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Detail icon={CalendarDays} label="Date">{formatDate(appointment.appointmentDate)}</Detail>
        <Detail icon={Clock} label="Time">{appointment.timeSlot}</Detail>
        <Detail icon={Video} label="Type">{appointment.consultationType === 'virtual' ? 'Virtual' : 'At clinic'}</Detail>
        <div className="min-w-0">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Payment</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={STATUS_TONES[appointment.paymentStatus]}>{appointment.paymentStatus === 'PAID' ? `Paid ₹${appointment.paymentAmount ?? appointment.fee}` : `₹${appointment.fee} ${appointment.paymentStatus.toLowerCase()}`}</StatusBadge>
          </dd>
        </div>
      </dl>

      <div className="min-w-0 space-y-2 border-t border-line pt-3 text-[clamp(0.75rem,1.7vw,0.82rem)]">
        <a href={phoneHref} className="flex min-h-9 min-w-0 items-center gap-2 break-all text-ink hover:text-maroon">
          <Phone size={15} className="shrink-0 text-muted" aria-hidden="true" />
          {appointment.phoneNumber}
        </a>
        {appointment.email && (
          <a href={`mailto:${appointment.email}`} className="flex min-h-9 min-w-0 items-center gap-2 break-all text-ink hover:text-maroon">
            <Mail size={15} className="shrink-0 text-muted" aria-hidden="true" />
            {appointment.email}
          </a>
        )}
        {appointment.consultationType === 'virtual' && appointment.meetUrl && (
          <a href={appointment.meetUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-9 min-w-0 items-center gap-2 font-semibold text-maroon hover:underline">
            <Video size={15} className="shrink-0" aria-hidden="true" />
            Join Google Meet
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatusBadge tone="neutral">{appointment.source === 'OFFLINE' ? 'Offline patient' : 'Website'}</StatusBadge>
        <StatusBadge tone={appointment.whatsappOptIn ? 'success' : 'neutral'}>{appointment.whatsappOptIn ? 'WhatsApp opted in' : 'No WhatsApp consent'}</StatusBadge>
        {awaiting && <StatusBadge tone="warning">Awaiting attendance</StatusBadge>}
        {appointment.status === 'COMPLETED' && (
          <StatusBadge tone={appointment.feedbackRequested ? 'success' : 'neutral'}>{appointment.feedbackRequested ? 'Feedback requested' : 'Feedback eligible'}</StatusBadge>
        )}
      </div>

      {(paymentMethod || appointment.attendanceMarkedAt || appointment.cancelReason || appointment.status === 'PENDING_PAYMENT') && (
        <p className="break-words text-[0.72rem] leading-relaxed text-muted">
          {appointment.status === 'PENDING_PAYMENT' && appointment.holdExpiresAt && <>Held until {formatDateTime(appointment.holdExpiresAt)}. </>}
          {appointment.paymentConfirmedAt && <>Paid via {paymentMethod}{appointment.paymentReference ? ` (${appointment.paymentReference})` : ''}, confirmed by {appointment.paymentConfirmedBy || 'staff'} on {formatDateTime(appointment.paymentConfirmedAt)}. </>}
          {appointment.attendanceMarkedAt && <>Attendance marked by {appointment.attendanceMarkedBy || 'staff'} on {formatDateTime(appointment.attendanceMarkedAt)}. </>}
          {appointment.cancelReason && <>Reason: {appointment.cancelReason}.</>}
        </p>
      )}

      {failed && can('automation:retry') && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-[0.75rem] leading-relaxed text-red-600">Some calendar or message steps did not complete. The appointment itself is not affected.</p>
          <button type="button" onClick={() => onRetry(appointment)} disabled={busy} className={outlineButton}>
            <RefreshCw size={15} aria-hidden="true" />
            Retry failed steps
          </button>
        </div>
      )}

      {actions && <div className="border-t border-line pt-4">{actions}</div>}
    </article>
  );
}
