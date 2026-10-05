import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:px-4 sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[calc(100dvh_-_1rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F3F3] text-[#4F172D] transition hover:bg-[#FFECF0] sm:right-4 sm:top-4"
        >
          <X size={18} />
        </button>

        <div className="px-4 py-5 xs:px-5 xs:py-6 sm:px-8 sm:py-8">
          <h2 className="pr-10 text-[clamp(1.1rem,4vw,1.25rem)] font-semibold leading-tight text-maroon">{title}</h2>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
