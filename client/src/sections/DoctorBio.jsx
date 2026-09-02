import { CheckCircle2 } from 'lucide-react';
import doctorPhoto from '../assets/images/doctor.jpg';
import { CLINIC } from '../utils/constants';

const HIGHLIGHTS = [
  'MBBS (PMCH, Patna), MS (Obstetrics & Gynaecology)',
  '25+ years of clinical experience; Ex-Senior Doctor, National Health Service (NHS), England',
  'Personalised, patient-centred care for every stage of women’s health'
];

export default function DoctorBio() {
  return (
    <section
      id="doctor"
      className="scroll-mt-20 py-12 sm:py-14 lg:py-16 bg-cream"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10">
        <div className="grid lg:grid-cols-[.72fr_1.28fr] gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
          <div className="group rounded-3xl overflow-hidden shadow-card aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] max-w-md mx-auto lg:max-w-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl">
            <img
              src={doctorPhoto}
              alt={`${CLINIC.doctor} at Sunaina Clinic`}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          </div>

          <div className="text-center lg:text-left">
            <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] text-maroon uppercase mb-3">
              Meet Your Doctor
            </p>

            <h2 className="text-2xl sm:text-3xl font-semibold text-ink mb-4">
              {CLINIC.doctor}
            </h2>

            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-5 max-w-2xl mx-auto lg:mx-0 text-justify">
              With specialist training in obstetrics and gynaecology, Dr. Priyanka
              brings together strong academic qualifications, including MBBS (PMCH,
              Patna) and MS (Obs & Gynae), with professional experience as an Ex
              Senior Doctor with the National Health Service (NHS), England. Her 25+
              years of Clinical experience have shaped a thoughtful, experienced and
              personal approach to women&apos;s healthcare.
            </p>

            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6 max-w-2xl mx-auto lg:mx-0 text-justify">
              From pregnancy and fertility concerns to PCOS, gynaecological health
              and ongoing women&apos;s wellness, every consultation is centred around
              clear guidance, informed decisions and care that recognises each
              patient&apos;s individual needs. With extensive clinical experience
              across different stages of women&apos;s health, Dr. Priyanka is
              committed to providing personalised, patient-centred care in a
              comfortable and supportive environment.
            </p>

            <ul className="space-y-3 inline-block text-left">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-[11px] sm:text-xs text-muted"
                >
                  <span className="w-8 h-8 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}