import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Check } from 'lucide-react';
import doctorPhoto from '../assets/images/doctor.jpg';
import { CLINIC, DIRECTIONS_URL } from '../utils/constants';

export default function Hero() {
  return (
    <section id="home" className="scroll-mt-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10 pt-4 sm:pt-5 lg:pt-6 pb-6 sm:pb-7 lg:pb-8">
        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-7 lg:gap-10 items-center">
          <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] text-maroon uppercase mb-3">
              Personal, Patient-Centred Women&apos;s Healthcare
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-ink leading-[1.13] mb-4">
              Expert Gynaecological Care,{' '}
              <span className="italic font-semibold text-maroon">
                Guided by International Training
              </span>{' '}
              and a Personal Approach.
            </h1>

            <p className="text-muted text-sm sm:text-[15px] leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
              Thoughtful, individualised care for every stage of a woman&apos;s
              health journey from pregnancy and fertility to PCOS,
              gynaecological concerns and ongoing wellness.
            </p>

            <div className="w-full max-w-[360px] mx-auto md:mx-0">
              <Link
                to="/appointment"
                className="flex items-center justify-center w-full bg-maroon text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
              >
                Book an Appointment
              </Link>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <a
                  href={CLINIC.phoneHref}
                  className="inline-flex items-center justify-center border border-maroon text-maroon text-xs font-semibold px-3 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
                >
                  Contact Us
                </a>

                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white border border-line text-ink text-xs font-semibold px-3 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
                >
                  Get Directions
                </a>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end pb-4 sm:pb-5">
            <div className="group rounded-3xl overflow-hidden shadow-card aspect-[5/6] sm:aspect-[4/3] lg:aspect-square max-w-md mx-auto lg:max-w-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl">
              <img
                src={doctorPhoto}
                alt="Dr. Priyanka Singh at Sunaina Clinic"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 bottom-1 sm:bottom-2 lg:bottom-3 min-w-[230px] sm:min-w-[250px] bg-white rounded-xl shadow-card border border-line px-3.5 py-2.5 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
                <Check
                  size={16}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>

              <div className="leading-tight text-left">
                <p className="text-xs font-semibold text-ink">
                  {CLINIC.doctor}
                </p>

                <p className="text-[10px] text-muted">
                  Specialist Women&apos;s Healthcare
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-line bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10 py-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <Info icon={MapPin} title="Visit Sunaina Clinic">
              <p className="text-[11px] sm:text-xs text-muted leading-relaxed max-w-[280px]">
                301 C, 3rd Floor, Sri Sai Tower
                <br />
                Burdwan Compound, P&amp;T Colony
                <br />
                Lalpur, Ranchi, Jharkhand
              </p>

              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-2 text-[11px] sm:text-xs font-semibold text-maroon transition-all duration-200 hover:underline"
              >
                Get Directions →
              </a>
            </Info>

            <Info
              icon={Clock}
              title="Consultation Hours"
              className="sm:border-l sm:border-line sm:pl-6"
            >
              <p className="text-[11px] sm:text-xs font-medium text-ink">
                {CLINIC.hours}
              </p>

              {CLINIC.hoursNote && (
                <p className="text-[10px] sm:text-[11px] text-muted mt-1">
                  {CLINIC.hoursNote}
                </p>
              )}
            </Info>

            <Info
              icon={Phone}
              title="Speak With Our Team"
              className="sm:border-l sm:border-line sm:pl-6"
            >
              <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
                For appointments, enquiries and clinic information.
              </p>

              <a
                href={CLINIC.phoneHref}
                className="inline-flex mt-2 text-[11px] sm:text-xs font-semibold text-maroon hover:underline"
              >
                {CLINIC.phone}
              </a>
            </Info>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`flex items-start gap-3 min-w-0 ${className}`}>
      <span className="w-10 h-10 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
        <Icon
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 pt-0.5">
        <p className="text-xs sm:text-sm font-semibold text-ink mb-1.5">
          {title}
        </p>

        {children}
      </div>
    </div>
  );
}