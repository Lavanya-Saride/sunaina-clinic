import { useState } from 'react';
import { MapPin, Clock, Phone, Check } from 'lucide-react';
import doctorPhoto from '../assets/images/doctor.jpg';
import { CLINIC, DIRECTIONS_URL, SITE_CONTENT } from '../utils/constants';
import ContactPopup from '../components/ContactPopup';

export default function Hero() {
  const [showContact, setShowContact] = useState(false);
  const { hero } = SITE_CONTENT;

  return (
    <section id="home" className="scroll-mt-20 overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4 xs:px-5 sm:px-7 sm:pb-7 sm:pt-5 lg:px-10 lg:pb-8 lg:pt-6">
        <div className="grid items-center gap-7 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
            <p className="mb-3 text-[clamp(0.58rem,1.5vw,0.625rem)] font-semibold uppercase tracking-[0.12em] text-maroon">
              {hero.eyebrow}
            </p>

            <h1 className="mb-4 text-[clamp(1.5rem,6.5vw,2.625rem)] font-bold leading-[1.12] text-ink">
              {hero.title}<br />
              {hero.titleEmphasis}{' '}
              {hero.titleSuffix}
            </h1>

            <p className="mx-auto mb-6 max-w-lg text-[clamp(0.78rem,2vw,0.9375rem)] leading-relaxed text-muted lg:mx-0">
              {hero.description}
            </p>

            <div className="mx-auto w-full max-w-[360px] lg:mx-0">
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-maroon px-3 text-[clamp(0.7rem,1.8vw,0.75rem)] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
                >
                  <Phone size={16} />
                  {hero.contact}
                </button>

                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-3 text-[clamp(0.7rem,1.8vw,0.75rem)] font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
                >
                  <MapPin size={16} />
                  {hero.directions}
                </a>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center pb-4 sm:pb-5 lg:justify-end">
            <div className="group mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl sm:aspect-[4/3] lg:mx-0 lg:aspect-square lg:max-w-none">
              <img
                src={doctorPhoto}
                alt={`${CLINIC.doctor} at ${CLINIC.name}`}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div className="absolute bottom-1 left-1/2 flex w-[calc(100%_-_2rem)] max-w-[250px] -translate-x-1/2 items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 shadow-card sm:bottom-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-maroon">
                <Check
                  size={16}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>

              <div className="min-w-0 text-left leading-tight">
                <p className="truncate text-[clamp(0.68rem,1.6vw,0.75rem)] font-semibold text-ink">
                  {CLINIC.doctor}
                </p>

                <p className="text-[clamp(0.58rem,1.4vw,0.625rem)] text-muted">
                  {hero.doctorSpeciality}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-line bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 xs:px-5 sm:px-7 lg:px-10">
          <div className="grid gap-5 sm:grid-cols-3">
            <Info
              icon={MapPin}
              title={hero.visitTitle}
            >
              <p className="max-w-[280px] text-[clamp(0.68rem,1.5vw,0.75rem)] leading-relaxed text-muted">
                {CLINIC.address.lines.map((line) => (
                  <span
                    key={line}
                    className="block"
                  >
                    {line}
                  </span>
                ))}
              </p>

              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-[clamp(0.68rem,1.5vw,0.75rem)] font-semibold text-maroon hover:underline"
              >
                {hero.directionsLink}
              </a>
            </Info>

            <Info
              icon={Clock}
              title={hero.hoursTitle}
              className="sm:border-l sm:border-line sm:pl-6"
            >
              <p className="text-[clamp(0.68rem,1.5vw,0.75rem)] font-medium text-ink">
                {CLINIC.workingHours}
              </p>

              <p className="mt-1 text-[clamp(0.62rem,1.4vw,0.6875rem)] text-muted">
                {CLINIC.hoursNote}
              </p>
            </Info>

            <Info
              icon={Phone}
              title={hero.teamTitle}
              className="sm:border-l sm:border-line sm:pl-6"
            >
              <p className="text-[clamp(0.68rem,1.5vw,0.75rem)] leading-relaxed text-muted">
                {hero.teamDescription}
              </p>

              <button
                type="button"
                onClick={() => setShowContact(true)}
                className="mt-2 inline-flex text-[clamp(0.68rem,1.5vw,0.75rem)] font-semibold text-maroon hover:underline"
              >
                {CLINIC.phone}
              </button>
            </Info>
          </div>
        </div>
      </div>

      {showContact && (
        <ContactPopup
          onClose={() => setShowContact(false)}
        />
      )}
    </section>
  );
}

function Info({
  icon: Icon,
  title,
  children,
  className = '',
}) {
  return (
    <div
      className={`flex min-w-0 items-start gap-3 ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-maroon">
        <Icon
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 pt-0.5">
        <p className="mb-1.5 text-[clamp(0.72rem,1.8vw,0.875rem)] font-semibold text-ink">
          {title}
        </p>

        {children}
      </div>
    </div>
  );
}