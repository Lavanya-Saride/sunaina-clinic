import { CalendarDays, Clock, Mail, Phone, Video } from 'lucide-react';
import StatusBadge from './StatusBadge';
import {
  STATUS_TABS,
  STATUS_TONES,
  formatDate,
  formatDateTime,
  isAwaitingAttendance,
} from '../../utils/dashboard';

const primaryButton =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60';
const outlineButton =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-ink transition-colors hover:bg-blush disabled:cursor-not-allowed disabled:opacity-60';

const STATUS_LABELS = Object.fromEntries(STATUS_TABS.map((tab) => [tab.value, tab.label.split(' /')[0]]));

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

export default function AppointmentCard({ appointment, can, busy, onConfirmPayment, onAttendance, onCancel }) {
  const awaiting = isAwaitingAttendance(appointment);
  const phoneHref = `tel:${appointment.phoneNumber.replace(/[^\d+]/g, '')}`;

  const renderActions = () => {
    if (appointment.status === 'PENDING_PAYMENT' && (can('payments:confirm') || can('appointments:cancel'))) {
      return (
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          {can('payments:confirm') && (
            <button type="button" onClick={() => onConfirmPayment(appointment)} disabled={busy} className={primaryButton}>Confirm payment</button>
          )}
          {can('appointments:cancel') && (
            <button type="button" onClick={() => onCancel(appointment)} disabled={busy} className={outlineButton}>Cancel</button>
          )}
        </div>
      );
    }

    if (appointment.status === 'CONFIRMED') {
      return (
        <div className="space-y-3">
          {can('attendance:mark') && (
            <div className="space-y-3">
              <p className="text-[clamp(0.78rem,1.8vw,0.85rem)] font-semibold leading-relaxed text-ink">
                Mark this visit as completed? A feedback request will be sent.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => onAttendance(appointment, 'COMPLETED')} disabled={busy} className={primaryButton}>
                  Completed
                </button>
                <button type="button" onClick={() => onAttendance(appointment, 'ABSENT')} disabled={busy} className={outlineButton}>
                  Absent
                </button>
              </div>
            </div>
          )}
          {can('appointments:cancel') && (
            <button type="button" onClick={() => onCancel(appointment)} disabled={busy} className="min-h-11 w-full text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-muted underline-offset-2 hover:text-maroon hover:underline">
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
    <article className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-card xs:p-5">
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
        {awaiting && <StatusBadge tone="warning">Awaiting attendance</StatusBadge>}
        {appointment.status === 'COMPLETED' && (
          <StatusBadge tone={appointment.feedbackRequested ? 'success' : 'neutral'}>{appointment.feedbackRequested ? 'Feedback requested' : 'Feedback eligible'}</StatusBadge>
        )}
      </div>

      {(appointment.attendanceMarkedAt || appointment.cancelReason || appointment.status === 'PENDING_PAYMENT') && (
        <p className="break-words text-[0.72rem] leading-relaxed text-muted">
          {appointment.status === 'PENDING_PAYMENT' && appointment.holdExpiresAt && <>Held until {formatDateTime(appointment.holdExpiresAt)}. </>}
          {appointment.paymentConfirmedAt && <>Payment confirmed by {appointment.paymentConfirmedBy || 'staff'} on {formatDateTime(appointment.paymentConfirmedAt)}. </>}
          {appointment.attendanceMarkedAt && <>Attendance marked by {appointment.attendanceMarkedBy || 'staff'} on {formatDateTime(appointment.attendanceMarkedAt)}. </>}
          {appointment.cancelReason && <>Reason: {appointment.cancelReason}.</>}
        </p>
      )}

      {actions && <div className="border-t border-line pt-4">{actions}</div>}
    </article>
  );
}