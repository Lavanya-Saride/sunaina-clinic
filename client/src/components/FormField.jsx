export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = true,
  options,
  placeholder,
  rows = 6,
  maxLength,
}) {
  const errorId = `${id}-error`;
  const sharedClasses = 'w-full min-w-0 rounded-xl border bg-cream/60 px-3.5 py-3 text-[clamp(0.8rem,2vw,0.875rem)] leading-relaxed text-ink placeholder:text-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30 transition-colors xs:px-4';
  const borderClass = error ? 'border-red-400' : 'border-line focus:border-maroon';

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold uppercase tracking-wide text-ink/80">
        {label}
      </label>

      {type === 'select' ? (
        <select id={id} name={id} value={value} onChange={onChange} onBlur={onBlur} required={required} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} className={`${sharedClasses} ${borderClass}`}>
          <option value="" disabled>{placeholder || 'Select a service'}</option>
          {options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={id} name={id} value={value} onChange={onChange} onBlur={onBlur} required={required} rows={rows} maxLength={maxLength} placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} className={`${sharedClasses} ${borderClass} min-h-32 resize-y`} />
      ) : (
        <input id={id} name={id} type={type} value={value} onChange={onChange} onBlur={onBlur} required={required} maxLength={maxLength} placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} className={`${sharedClasses} ${borderClass}`} />
      )}

      {error && <p id={errorId} className="mt-1.5 text-[clamp(0.65rem,1.5vw,0.75rem)] text-red-500">{error}</p>}
    </div>
  );
}
