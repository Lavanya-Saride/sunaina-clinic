import { CheckCircle2 } from 'lucide-react';
import doctorPhoto from '../assets/images/doctor.jpg';
import { CLINIC, SITE_CONTENT } from '../utils/constants';

export default function DoctorBio() {
  const { doctor } = SITE_CONTENT;

  return (
    <section id="doctor" className="scroll-mt-20 bg-cream py-10 xs:py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 xs:px-5 sm:px-7 lg:px-10">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-7 lg:grid-cols-[.72fr_1.28fr] lg:gap-12">
          <div className="group mx-auto w-full max-w-sm overflow-hidden rounded-3xl shadow-card aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] lg:max-w-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl">
            <img src={doctorPhoto} alt={`${CLINIC.doctor} at ${CLINIC.name}`} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
          </div>

          <div className="min-w-0 text-center lg:text-left">
            <p className="mb-3 text-[clamp(0.6rem,1.2vw,0.7rem)] font-semibold uppercase tracking-[0.12em] text-maroon">
              {doctor.eyebrow}
            </p>

            <h2 className="mb-4 text-[clamp(1.5rem,3vw,1.875rem)] font-semibold leading-tight text-ink">
              {CLINIC.doctor}
            </h2>

            <p className="mx-auto mb-5 max-w-2xl text-justify text-[clamp(0.75rem,1.5vw,0.875rem)] leading-6 sm:leading-7 text-muted lg:mx-0">
              {doctor.paragraphOne}
            </p>

            <p className="mx-auto mb-6 max-w-2xl text-justify text-[clamp(0.75rem,1.5vw,0.875rem)] leading-6 sm:leading-7 text-muted lg:mx-0">
              {doctor.paragraphTwo}
            </p>

            <ul className="mx-auto inline-flex max-w-full flex-col space-y-3 text-left">
              {doctor.highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[clamp(0.7rem,1.4vw,0.75rem)] text-muted">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-maroon">
                    <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="pt-1 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
