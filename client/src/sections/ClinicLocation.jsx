import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  CLINIC,
  DIRECTIONS_URL,
} from '../utils/constants';

export default function ClinicLocation() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const mapUrl = useMemo(
    () =>
      `https://www.google.com/maps?q=${encodeURIComponent(
        CLINIC.address.full
      )}&output=embed`,
    []
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!mapLoaded) {
        setMapFailed(true);
      }
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [mapLoaded]);

  return (
    <section
      id="location"
      className="scroll-mt-20 bg-cream py-10 xs:py-12 sm:py-14 lg:py-16"
    >
      <div className="mx-auto w-full max-w-6xl px-4 xs:px-5 sm:px-7 lg:px-10">
        <div className="mb-7 text-center sm:mb-8">
          <h2 className="text-[clamp(1.25rem,3vw,1.5rem)] font-semibold leading-tight text-ink">
            Visit Sunaina Clinic
          </h2>
        </div>

        <div className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card lg:grid-cols-[1.15fr_.85fr]">
          <div className="relative min-h-[280px] sm:min-h-[340px] lg:min-h-[380px]">
            {!mapFailed && (
              <iframe
                title={`${CLINIC.name} location`}
                src={mapUrl}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setMapLoaded(true)}
                onError={() => setMapFailed(true)}
              />
            )}

            {mapFailed && (
              <div className="flex h-full min-h-[280px] items-center justify-center bg-[#F5F3F3] p-6 text-center sm:min-h-[340px]">
                <div className="max-w-sm">
                  <MapPin
                    size={28}
                    className="mx-auto mb-3 text-maroon"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-ink">
                    {CLINIC.name}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {CLINIC.address.full}
                  </p>
                  <a
                    href={DIRECTIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-maroon px-5 text-xs font-semibold text-white transition-colors hover:bg-maroon-dark"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center border-t border-line p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-maroon">
                <MapPin size={18} aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink">
                  {CLINIC.name}
                </h3>
                <p className="mt-2 break-words text-xs leading-relaxed text-muted">
                  {CLINIC.address.full}
                </p>
              </div>
            </div>

            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-maroon px-4 text-xs font-semibold text-white transition-colors hover:bg-maroon-dark"
            >
              Get Directions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
