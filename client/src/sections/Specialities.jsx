import Carousel from '../components/Carousel';
import getIcon from '../utils/iconMap';
import { SPECIALITIES } from '../utils/constants';
import { SITE_CONTENT } from '../utils/constants';

function SpecialityCard({ title, icon }) {
  const Icon = getIcon(icon);

  return (
    <div className="flex h-full min-h-[132px] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white px-3 py-4 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl xs:min-h-[140px]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-maroon">
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="text-[clamp(0.68rem,1.7vw,0.75rem)] font-semibold leading-snug text-ink">{title}</p>
    </div>
  );
}

export default function Specialities() {
  return (
    <section id="specialities" className="scroll-mt-20 bg-cream py-10 xs:py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 xs:px-5 sm:px-7 lg:px-10">
        <h2 className="mb-7 text-center text-[clamp(1.25rem,3vw,1.5rem)] font-semibold leading-tight text-ink sm:mb-8">
          {SITE_CONTENT.specialities.title}
        </h2>

        <div className="hidden lg:grid lg:grid-cols-6 lg:gap-3">
          {SPECIALITIES.map((item) => <SpecialityCard key={item.id} {...item} />)}
        </div>

        <div className="lg:hidden">
          <Carousel
            items={SPECIALITIES}
            ariaLabel={SITE_CONTENT.specialities.ariaLabel}
            autoplayDelay={3500}
            showDots
            loop
            slideClassName="flex-[0_0_calc((100%-0.75rem)/2)] sm:flex-[0_0_calc((100%-0.75rem)/2)] md:flex-[0_0_calc((100%-1.5rem)/3)]"
            renderItem={(item) => <SpecialityCard {...item} />}
          />
        </div>
      </div>
    </section>
  );
}
