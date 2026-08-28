export default function StateMessage({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-10 px-6 bg-white border border-dashed border-line rounded-2xl max-w-lg mx-auto">
      {Icon && (
        <span className="inline-flex w-12 h-12 rounded-full bg-blush items-center justify-center text-maroon mb-4">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <p className="font-semibold text-ink mb-1">{title}</p>
      {description && <p className="text-sm text-muted mb-4">{description}</p>}
      {action}
    </div>
  );
}
