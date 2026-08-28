import Carousel from '../components/Carousel';
import getIcon from '../utils/iconMap';
import { SPECIALITIES } from '../utils/specialities';

function SpecialityCard({ title, icon }) {
  const Icon = getIcon(icon);

  return (
    <div className="h-full min-h-[140px] bg-white border border-line rounded-2xl px-3 py-4 flex flex-col items-center justify-center text-center gap-3 shadow-card transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl">
      <span className="w-10 h-10 rounded-full bg-blush flex items-center justify-center text-maroon">
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </span>

      <p className="text-[11px] sm:text-xs font-semibold text-ink leading-snug">
        {title}
      </p>
    </div>
  );
}

export default function Specialities() {
  return (
    <section
      id="specialities"
      className="scroll-mt-20 py-12 sm:py-14 lg:py-16 bg-cream"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink text-center mb-7 sm:mb-8">
          Our Specialities
        </h2>

        <div className="hidden lg:grid grid-cols-6 gap-3">
          {SPECIALITIES.map((item) => (
            <SpecialityCard key={item.id} {...item} />
          ))}
        </div>

        <div className="lg:hidden">
          <Carousel
            items={SPECIALITIES}
            ariaLabel="Our specialities"
            autoplayDelay={3500}
            showDots
            slideClassName="
              flex-[0_0_calc((100%-0.75rem)/2)]
              sm:flex-[0_0_calc((100%-2.25rem)/4)]
            "
            renderItem={(item) => <SpecialityCard {...item} />}
          />
        </div>
      </div>
    </section>
  );
}