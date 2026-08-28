import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';
import { CLINIC, NAV_LINKS } from '../utils/constants';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-line transition-shadow duration-300 ${
        isScrolled ? 'shadow-card' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10">
        <div className="flex items-center justify-between h-[68px] sm:h-[74px]">
        <Link
          to="/"
          className="flex items-center gap-0 shrink-0 group"
          aria-label="Sunaina Clinic home"
        >
          <img
            src={logo}
            alt="Sunaina Clinic logo"
            className="w-12 h-12 sm:w-[52px] sm:h-[52px] lg:w-[56px] lg:h-[56px] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />

          <img
            src={title}
            alt="Sunaina Clinic"
            className="-ml-[6px] sm:-ml-[8px] lg:-ml-[10px] h-7 sm:h-8 lg:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>

          <nav
            className="hidden md:flex items-center gap-6 lg:gap-8"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={`/${link.href}`}
                className="text-[11px] lg:text-xs font-medium tracking-[0.12em] uppercase text-ink/80 hover:text-maroon border-b border-transparent py-1 transition-all duration-300"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            to="/appointment"
            className="inline-flex items-center bg-maroon hover:bg-maroon-dark hover:scale-[1.03] hover:shadow-lg text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all duration-300 shrink-0"
          >
            Book an Appointment
          </Link>
        </div>
      </div>
    </header>
  );
}