import { useEffect } from 'react';
import { Copy, Phone, X } from 'lucide-react';
import { CLINIC } from '../utils/constants';

export default function ContactPopup({ onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(CLINIC.phone);
    } catch {
    }
  };

  return (
    <div className="fixed inset-0 z-[100] hidden lg:flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
      <button aria-label="Close contact dialog" className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-line shadow-2xl p-7">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 rounded-full bg-blush text-maroon flex items-center justify-center hover:shadow-md transition-shadow">
          <X size={18} />
        </button>
        <div className="w-12 h-12 rounded-full bg-blush text-maroon flex items-center justify-center mb-4">
          <Phone size={20} />
        </div>
        <h2 id="contact-dialog-title" className="text-xl font-semibold text-ink mb-2">Contact Sunaina Clinic</h2>
        <p className="text-sm text-muted leading-relaxed mb-5">For appointments, enquiries and clinic information, please call our clinic team.</p>
        <div className="rounded-2xl bg-cream border border-line p-4 mb-5">
          <p className="text-xs text-muted mb-1">Clinic phone</p>
          <p className="text-lg font-semibold text-maroon">{CLINIC.phone}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a href={CLINIC.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-maroon text-white px-4 py-3 text-sm font-semibold hover:shadow-lg transition-shadow">
            <Phone size={16} /> Try to Call
          </a>
          <button type="button" onClick={copyNumber} className="inline-flex items-center justify-center gap-2 rounded-full border border-maroon text-maroon px-4 py-3 text-sm font-semibold hover:bg-blush transition-colors">
            <Copy size={16} /> Copy Number
          </button>
        </div>
      </div>
    </div>
  );
}
