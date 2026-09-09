import Carousel from '../components/Carousel';
import getIcon from '../utils/iconMap';
import { WHY_CHOOSE_US } from '../utils/constants';
import { SITE_CONTENT } from '../utils/constants';

function ReasonCard({ title, body, icon }) {
  const Icon = getIcon(icon);

  return (
    <div className="flex h-full min-h-[190px] flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg xs:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-maroon">
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="mb-2 text-[clamp(0.8rem,1.8vw,0.875rem)] font-semibold leading-tight text-ink">{title}</h3>
        <p className="text-[clamp(0.7rem,1.5vw,0.75rem)] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

export default function WhyChooseUs() {
  return (
    <section id="about" className="scroll-mt-20 bg-white py-10 xs:py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 xs:px-5 sm:px-7 lg:px-10">
        <h2 className="mb-7 text-center text-[clamp(1.25rem,3vw,1.5rem)] font-semibold leading-tight text-ink sm:mb-8">
          {SITE_CONTENT.whyChooseUs.title}
        </h2>

        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
          {WHY_CHOOSE_US.map((item) => <ReasonCard key={item.id} {...item} />)}
        </div>

        <div className="lg:hidden">
          <Carousel
            items={WHY_CHOOSE_US}
            ariaLabel={SITE_CONTENT.whyChooseUs.ariaLabel}
            autoplayDelay={4500}
            showDots
            loop
            slideClassName="flex-[0_0_100%] sm:flex-[0_0_calc((100%-0.75rem)/2)]"
            renderItem={(item) => <ReasonCard {...item} />}
          />
        </div>
      </div>
    </section>
  );
}
