const TONES = {
  neutral: 'border-line bg-cream text-muted',
  brand: 'border-blush-dark bg-blush text-maroon',
  success: 'border-green-200 bg-green-50 text-green-700',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  danger: 'border-red-200 bg-red-50 text-red-600',
};

export default function StatusBadge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold leading-none ${TONES[tone]}`}>
      {children}
    </span>
  );
}
