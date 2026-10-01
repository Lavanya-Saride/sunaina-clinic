import { UI_CONTENT } from '../utils/constants';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase()
    )
    .join('');
}

export default function FeedbackCard({
  name,
  story,
  rating = 5,
  source,
  authorUrl,
  reviewUrl,
}) {
  return (
    <article className="flex h-full min-h-[220px] w-full flex-col rounded-2xl border border-line bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg xs:min-h-[230px] xs:p-5">
      <div
        aria-label={UI_CONTENT.stars}
        className="mb-3 text-sm tracking-[0.2em] text-yellow-600"
      >
        {'★'.repeat(
          Math.max(
            0,
            Math.min(5, Math.round(rating))
          )
        )}
      </div>

      <p className="mb-5 line-clamp-6 flex-1 break-words text-[clamp(0.72rem,1.7vw,0.75rem)] leading-relaxed text-ink/90">
        “{story}”
      </p>

      <div className="flex min-w-0 items-center gap-2.5 border-t border-line pt-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-[clamp(0.6rem,1.4vw,0.625rem)] font-semibold text-maroon">
          {getInitials(name)}
        </span>

        <div className="min-w-0 flex-1">
          {authorUrl ? (
            <a
              href={authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-words text-[clamp(0.68rem,1.5vw,0.6875rem)] font-semibold text-ink hover:underline"
            >
              {name}
            </a>
          ) : (
            <p className="break-words text-[clamp(0.68rem,1.5vw,0.6875rem)] font-semibold text-ink">
              {name}
            </p>
          )}

          {source === 'google' && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.6rem] text-ink/60">
              <span>Google</span>

              {reviewUrl && (
                <>
                  <span>•</span>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    View on Google Maps
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}