import Carousel from '../components/Carousel';
import getIcon from '../utils/iconMap';
import { WHY_CHOOSE_US } from '../utils/whyChooseUs';

function ReasonCard({ title, body, icon }) {
  const Icon = getIcon(icon);

  return (
    <div className="h-full min-h-[190px] bg-white border border-line rounded-2xl p-5 shadow-card flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg">
      <span className="w-10 h-10 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
        <Icon
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-2">
          {title}
        </h3>

        <p className="text-[11px] text-muted leading-relaxed text-justify">
          {body}
        </p>
      </div>
    </div>
  );
}

export default function WhyChooseUs() {
  return (
    <section
      id="about"
      className="scroll-mt-20 py-12 sm:py-14 lg:py-16 bg-white"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink text-center mb-7 sm:mb-8">
          Why Choose Sunaina Clinic?
        </h2>

        <div className="hidden lg:grid grid-cols-2 gap-4">
          {WHY_CHOOSE_US.map((item) => (
            <ReasonCard
              key={item.id}
              {...item}
            />
          ))}
        </div>

        <div className="lg:hidden">
          <Carousel
            items={WHY_CHOOSE_US}
            ariaLabel="Why choose Sunaina Clinic"
            autoplayDelay={4500}
            showDots
            loop={false}
            slideClassName="flex-[0_0_100%] sm:flex-[0_0_calc((100%-0.75rem)/2)]"
            renderItem={(item) => (
              <ReasonCard {...item} />
            )}
          />
        </div>
      </div>
    </section>
  );
}