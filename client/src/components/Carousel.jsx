import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import useReducedMotion from '../hooks/useReducedMotion';

export default function Carousel({
  items,
  renderItem,
  slideClassName = 'flex-[0_0_100%] sm:flex-[0_0_50%]',
  ariaLabel = 'Carousel',
  autoplayDelay = 4000,
  showDots = true,
  loop = false,
}) {
  const prefersReducedMotion = useReducedMotion();
  const hasItems = Array.isArray(items) && items.length > 0;

  const autoplay = useMemo(() => {
    if (
      prefersReducedMotion ||
      !hasItems ||
      items.length < 2
    ) {
      return null;
    }

    return Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      playOnInit: true,
    });
  }, [
    prefersReducedMotion,
    hasItems,
    items?.length,
    autoplayDelay,
  ]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: loop && items?.length > 1,
      align: 'start',
      dragFree: false,
      containScroll: 'trimSnaps',
    },
    autoplay ? [autoplay] : []
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  const onSelect = useCallback((api) => {
    if (api) {
      setSelectedIndex(api.selectedScrollSnap());
    }
  }, []);

  useEffect(() => {
    if (!emblaApi) {
      return undefined;
    }

    const updateCarousel = () => {
      const snaps = emblaApi.scrollSnapList();

      setScrollSnaps(
        Array.isArray(snaps) ? snaps : []
      );

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

  if (!hasItems) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="relative w-full min-w-0"
    >
      <div
        ref={emblaRef}
        className="overflow-hidden py-2"
      >
        <div className="flex flex-nowrap gap-3">
          {items.map((item, index) => (
            <div
              key={
                item.id ??
                item._id ??
                index
              }
              className={`${slideClassName} min-w-0 shrink-0`}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>

      {showDots &&
        scrollSnaps.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  emblaApi?.scrollTo(index)
                }
                aria-label={`Go to slide ${index + 1}`}
                aria-current={
                  index === selectedIndex
                    ? 'true'
                    : undefined
                }
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