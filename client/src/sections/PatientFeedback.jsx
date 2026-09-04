import { Link } from 'react-router-dom';
import { MessageSquareHeart, WifiOff } from 'lucide-react';
import Carousel from '../components/Carousel';
import FeedbackCard from '../components/FeedbackCard';
import FeedbackSkeleton from '../components/FeedbackSkeleton';
import StateMessage from '../components/StateMessage';
import useFeedback from '../hooks/useFeedback';

const hoverClass =
  'transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg hover:border-line focus:border-line focus:ring-0 focus:outline-none';

export default function PatientFeedback() {
  const { data, status, refetch } = useFeedback();

  const renderFeedbackCard = (item) => (
    <FeedbackCard
      name={item.name}
      story={item.story}
    />
  );

  return (
    <section
      id="feedback"
      className="scroll-mt-20 py-12 sm:py-14 lg:py-16 bg-white"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10">
        <div className="flex flex-col items-center text-center mb-7 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-4">
            What Our Patients Say
          </h2>

          <Link
            to="/feedback"
            className={`inline-flex items-center gap-2 bg-maroon text-white text-xs font-semibold px-4 py-2.5 rounded-full border border-maroon ${hoverClass}`}
          >
            Share Your Feedback
          </Link>
        </div>

        {status === 'loading' && <FeedbackSkeleton />}

        {status === 'error' && (
          <StateMessage
            icon={WifiOff}
            title="We couldn't load patient feedback right now"
            description="Please check your connection and try again in a moment."
            action={
              <button
                type="button"
                onClick={refetch}
                className={`text-sm font-semibold text-maroon border border-line rounded-full px-4 py-2 ${hoverClass}`}
              >
                Try again
              </button>
            }
          />
        )}

        {status === 'success' && data.length === 0 && (
          <StateMessage
            icon={MessageSquareHeart}
            title="No feedback shared yet"
            description="Be the first to share your experience at Sunaina Clinic."
            action={
              <Link
                to="/feedback"
                className={`inline-block text-sm font-semibold text-maroon border border-line rounded-full px-4 py-2 ${hoverClass}`}
              >
                Share Your Feedback
              </Link>
            }
          />
        )}

        {status === 'success' && data.length > 0 && (
          <>
            <div className="hidden lg:grid grid-cols-3 gap-4">
              {data.slice(0, 3).map((item) => (
                <div key={item._id ?? item.id}>
                  {renderFeedbackCard(item)}
                </div>
              ))}
            </div>

            <div className="lg:hidden">
              <Carousel
                items={data}
                ariaLabel="Patient feedback"
                autoplayDelay={5000}
                showDots
                slideClassName="
                  flex-[0_0_100%]
                  sm:flex-[0_0_calc((100%-0.75rem)/2)]
                "
                renderItem={renderFeedbackCard}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}