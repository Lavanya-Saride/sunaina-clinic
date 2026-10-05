import { useState } from 'react';
import Modal from './Modal';
import FormField from '../FormField';
import { PAYMENT_METHOD_OPTIONS, formatDate, getErrorMessage } from '../../utils/dashboard';

export default function PaymentModal({ appointment, onClose, onSubmit }) {
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState(String(appointment.fee));
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const parsedAmount = Number(amount);

    if (!method) {
      setError('Please select the payment method.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      setError('Please enter the amount received.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({ method, amount: parsedAmount, ...(reference.trim() ? { reference: reference.trim() } : {}) });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Confirm payment" onClose={onClose}>
      <p className="mb-5 break-words text-[clamp(0.75rem,1.8vw,0.85rem)] leading-relaxed text-muted">
        <span className="font-semibold text-ink">{appointment.fullName}</span>
        {' · '}
        {formatDate(appointment.appointmentDate)}, {appointment.timeSlot}
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField id="payment-method" label="Payment method" type="select" placeholder="Select method" value={method} onChange={(event) => setMethod(event.target.value)} options={PAYMENT_METHOD_OPTIONS} />
        <FormField id="payment-amount" label="Amount received (₹)" type="number" inputMode="decimal" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <FormField id="payment-reference" label="Reference (optional)" value={reference} maxLength={100} placeholder="UPI transaction ID, receipt no." onChange={(event) => setReference(event.target.value)} required={false} />

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] leading-relaxed text-red-600">{error}</div>}

        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center rounded-full bg-maroon px-5 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60 xs:order-2">
            {submitting ? 'Confirming...' : 'Payment received'}
          </button>
          <button type="button" onClick={onClose} disabled={submitting} className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold text-ink transition-colors hover:bg-blush xs:order-1">
            Close
          </button>
        </div>
      </form>
    </Modal>
  );
}
