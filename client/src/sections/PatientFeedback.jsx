import { Link } from 'react-router-dom';
import { MessageSquareHeart, WifiOff } from 'lucide-react';
import Carousel from '../components/Carousel';
import FeedbackCard from '../components/FeedbackCard';
import FeedbackSkeleton from '../components/FeedbackSkeleton';
import StateMessage from '../components/StateMessage';
import useFeedback from '../hooks/useFeedback';
import { SITE_CONTENT } from '../utils/constants';

const hoverClass = 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-maroon/20';

export default function PatientFeedback() {
  const { data, status, refetch } = useFeedback();
  const { feedback } = SITE_CONTENT;

  return (
    <section id="feedback" className="scroll-mt-20 bg-white py-10 xs:py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 xs:px-5 sm:px-7 lg:px-10">
        <div className="mb-7 flex flex-col items-center text-center sm:mb-8">
          <h2 className="mb-4 text-[clamp(1.25rem,3vw,1.5rem)] font-semibold leading-tight text-ink">
            {feedback.title}
          </h2>
          <Link to="/feedback" className={`inline-flex items-center gap-2 rounded-full bg-maroon px-4 py-2.5 text-[clamp(0.7rem,1.6vw,0.75rem)] font-semibold text-white ${hoverClass}`}>
            {feedback.share}
          </Link>
        </div>

        {status === 'loading' && <FeedbackSkeleton />}

        {status === 'error' && (
          <StateMessage
            icon={WifiOff}
            title={feedback.loadErrorTitle}
            description={feedback.loadErrorDescription}
            action={<button type="button" onClick={refetch} className={`rounded-full border border-line px-4 py-2 text-[clamp(0.75rem,1.6vw,0.875rem)] font-semibold text-maroon ${hoverClass}`}>{feedback.retry}</button>}
          />
        )}

        {status === 'success' && data.length === 0 && (
          <StateMessage
            icon={MessageSquareHeart}
            title={feedback.emptyTitle}
            description={feedback.emptyDescription}
            action={<Link to="/feedback" className={`inline-block rounded-full border border-line px-4 py-2 text-[clamp(0.75rem,1.6vw,0.875rem)] font-semibold text-maroon ${hoverClass}`}>{feedback.share}</Link>}
          />
        )}

        {status === 'success' && data.length > 0 && (
          <Carousel
            items={data.slice(0, feedback.latestCount)}
            ariaLabel={feedback.ariaLabel}
            autoplayDelay={feedback.autoplayDelay}
            showDots
            loop
            slideClassName="flex-[0_0_100%] sm:flex-[0_0_calc((100%-0.75rem)/2)] lg:flex-[0_0_calc((100%-1.5rem)/3)]"
            renderItem={(item) => <FeedbackCard name={item.name} story={item.story} />}
          />
        )}
      </div>
    </section>
  );
}
