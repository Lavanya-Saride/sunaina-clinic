import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import useReducedMotion from '../hooks/useReducedMotion';

export default function Carousel({
  items,
  renderItem,
  slideClassName = 'flex-[0_0_100%] sm:flex-[0_0_calc((100%-0.75rem)/2)]',
  ariaLabel = 'Carousel',
  autoplayDelay = 4000,
  showDots = true,
  loop = false,
}) {
  const prefersReducedMotion = useReducedMotion();

  const autoplay = useMemo(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    return Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    });
  }, [autoplayDelay, prefersReducedMotion]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop,
      align: 'start',
      dragFree: false,
      containScroll: 'trimSnaps',
    },
    autoplay ? [autoplay] : []
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const updateCarousel = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect(emblaApi);
    };

    updateCarousel();

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', updateCarousel);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', updateCarousel);
    };
  }, [emblaApi, onSelect]);

  if (!items?.length) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="relative"
      onMouseEnter={() => autoplay?.stop()}
      onMouseLeave={() => autoplay?.play()}
    >
      <div
        ref={emblaRef}
        className="overflow-hidden py-2"
      >
        <div className="flex gap-3">
          {items.map((item, index) => (
            <div
              key={item.id ?? item._id ?? index}
              className={`${slideClassName} min-w-0`}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>

      {showDots && scrollSnaps.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selectedIndex}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? 'w-5 bg-maroon'
                  : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}