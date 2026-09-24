import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Phone,
  Check,
  CalendarDays,
  Video,
} from 'lucide-react';
import doctorPhoto from '../assets/images/doctor.jpg';
import {
  CLINIC,
  DIRECTIONS_URL,
  SITE_CONTENT,
} from '../utils/constants';
import ContactPopup from '../components/ContactPopup';

export default function Hero() {
  const [showContact, setShowContact] = useState(false);
  const { hero } = SITE_CONTENT;

  return (
    <section
      id="home"
      className="scroll-mt-20 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-1 xs:px-5 sm:px-7 sm:pb-7 sm:pt-2 lg:px-10 lg:pb-8 lg:pt-3">
        <div className="mb-5 text-center sm:mb-6">
          <h1 className="mx-auto max-w-4xl text-[clamp(1.15rem,3.6vw,1.75rem)] font-semibold leading-tight text-maroon">
            {hero.clinicHeadline}
          </h1>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          <div className="mx-auto w-full max-w-xl pt-6 text-center sm:pt-7 lg:mx-0 lg:pt-8 lg:text-left">
            <p className="mb-3 text-[clamp(0.58rem,1.5vw,0.625rem)] font-semibold uppercase tracking-[0.12em] text-maroon">
              {hero.eyebrow}
            </p>

            <h2 className="mb-4 text-[clamp(1.4rem,6vw,2.5rem)] font-bold leading-[1.12] text-ink">
              {hero.title}
              <br />
              {hero.titleEmphasis}{' '}
              {hero.titleSuffix}
            </h2>

            <p className="mx-auto mb-5 max-w-lg text-[clamp(0.76rem,1.9vw,0.9rem)] leading-relaxed text-muted lg:mx-0">
              {hero.description}
            </p>

            <p className="mx-auto mb-5 max-w-lg text-center text-[clamp(0.7rem,1.7vw,0.8rem)] font-bold italic leading-relaxed text-muted lg:mx-0 lg:text-left">
              {hero.clinicalGuidelines}
            </p>

            <div className="mx-auto w-full max-w-[430px] lg:mx-0">
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                <Link
                  to="/appointment?type=clinic"
                  state={{
                    consultationType: 'offline',
                  }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-3 text-[clamp(0.7rem,1.8vw,0.75rem)] font-semibold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-maroon/20"
                >
                  <CalendarDays size={16} />
                  {hero.bookAppointment}
                </Link>

                <Link
                  to="/appointment?type=virtual"
                  state={{
                    consultationType: 'virtual',
                  }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-maroon bg-white px-3 text-[clamp(0.7rem,1.8vw,0.75rem)] font-semibold text-maroon shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-blush hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-maroon/20"
                >
                  <Video size={16} />
                  {hero.videoConsultation}
                </Link>

                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="xs:col-span-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon px-3 text-[clamp(0.7rem,1.8vw,0.75rem)] font-semibold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-maroon/20"
                >
                  <Phone size={16} />
                  Contact Us
                </button>
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
                {CLINIC.address.lines.map(
                  (line) => (
                    <span
                      key={line}
                      className="block"
                    >
                      {line}
                    </span>
                  )
                )}
              </p>

              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-maroon px-4 text-[clamp(0.68rem,1.5vw,0.75rem)] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <MapPin
                  size={15}
                  aria-hidden="true"
                />
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
                onClick={() =>
                  setShowContact(true)
                }
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
          onClose={() =>
            setShowContact(false)
          }
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