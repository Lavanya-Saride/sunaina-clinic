function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function FeedbackCard({ name, service, story }) {
  return (
    <div className="h-full min-h-[230px] bg-white border border-line rounded-2xl p-5 shadow-card flex flex-col transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg">
      <span className="self-start text-[9px] font-semibold uppercase tracking-wide text-maroon bg-blush px-2.5 py-1 rounded-full mb-3">
        {service}
      </span>

      <p className="text-xs text-ink/90 leading-relaxed mb-5 flex-1 line-clamp-6">
        “{story}”
      </p>

      <div className="flex items-center gap-2.5 pt-3 border-t border-line">
        <span className="w-8 h-8 rounded-full bg-blush text-maroon text-[10px] font-semibold flex items-center justify-center shrink-0">
          {getInitials(name)}
        </span>

        <p className="text-[11px] font-semibold text-ink">
          {name}
        </p>
      </div>
    </div>
  );
}