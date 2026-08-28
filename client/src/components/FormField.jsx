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
  const sharedClasses =
    'w-full rounded-xl border bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30 transition-colors';
  const borderClass = error ? 'border-red-400' : 'border-line focus:border-maroon';

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold tracking-wide uppercase text-ink/80 mb-2">
        {label}
      </label>

      {type === 'select' ? (
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${sharedClasses} ${borderClass}`}
        >
          <option value="" disabled>
            Select a service
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${sharedClasses} ${borderClass} resize-none`}
        />
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${sharedClasses} ${borderClass}`}
        />
      )}

      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
