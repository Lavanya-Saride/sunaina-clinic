import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Menu, Phone, X } from 'lucide-react';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';
import ContactPopup from '../components/ContactPopup';
import {
  CLINIC,
  DIRECTIONS_URL,
  NAV_LINKS,
  SITE_CONTENT,
  UI_CONTENT,
} from '../utils/constants';

const contactLink =
  'inline-flex min-w-0 items-center gap-2 transition-colors hover:text-maroon';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);

    handleScroll();
    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () =>
      document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const openContact = () => {
    setMenuOpen(false);
    setShowContact(true);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur transition-shadow duration-300 ${
          isScrolled ? 'shadow-card' : ''
        }`}
      >
        <div className="mx-auto w-full max-w-6xl px-3 xs:px-4 sm:px-7 lg:px-10">
          <div className="flex min-h-[64px] items-center justify-between gap-3 sm:min-h-[74px]">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex min-w-0 shrink items-center"
              aria-label={`${CLINIC.name} ${UI_CONTENT.home}`}
            >
              <img
                src={logo}
                alt=""
                className="h-10 w-10 shrink-0 object-contain xs:h-12 xs:w-12 sm:h-[52px] sm:w-[52px] lg:h-[56px] lg:w-[56px]"
              />
              <img
                src={title}
                alt={SITE_CONTENT.hero.visitTitle}
                className="-ml-[5px] h-6 w-auto shrink-0 object-contain xs:h-7 sm:-ml-[8px] sm:h-8 lg:-ml-[10px] lg:h-9"
              />
            </Link>

            <nav
              className="hidden min-w-0 items-center gap-5 lg:flex xl:gap-8"
              aria-label={UI_CONTENT.primaryNavigation}
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={`/${link.href}`}
                  className="group relative whitespace-nowrap py-1 text-[0.75rem] font-medium uppercase tracking-[0.1em] text-ink/80 transition-colors duration-300 hover:text-maroon"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-maroon transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>

            <div className="hidden min-w-0 max-w-[360px] shrink-0 flex-col items-end gap-0.5 text-right lg:flex">
              <button
                type="button"
                onClick={() => setShowContact(true)}
                className={`${contactLink} text-[0.8125rem] font-semibold text-maroon`}
              >
                <Phone size={14} aria-hidden="true" />
                {CLINIC.phone}
              </button>

              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                title={CLINIC.address.full}
                className={`${contactLink} max-w-[360px] items-start text-[0.6875rem] leading-snug text-muted hover:text-maroon`}
              >
                <MapPin size={13} aria-hidden="true" className="shrink-0" />
                <span className="break-words">{CLINIC.address.full}</span>
              </a>
            </div>

            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setShowContact(true)}
                aria-label={`Contact ${CLINIC.name}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-maroon/30 bg-white px-3 text-[0.8125rem] font-semibold text-maroon transition-colors hover:bg-blush"
              >
                <Phone size={16} aria-hidden="true" />
                <span className="hidden min-[360px]:inline">
                  {CLINIC.phone}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-maroon text-white transition-colors hover:bg-maroon-dark"
              >
                {menuOpen ? (
                  <X size={20} aria-hidden="true" />
                ) : (
                  <Menu size={20} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh_-_64px)] overflow-y-auto border-b border-line bg-cream shadow-card lg:hidden"
          >
            <div className="mx-auto w-full max-w-6xl px-3 py-2 xs:px-4 sm:px-7">
              <nav aria-label={UI_CONTENT.primaryNavigation}>
                <ul>
                  {NAV_LINKS.map((link) => (
                    <li key={link.href} className="border-b border-line">
                      <a
                        href={`/${link.href}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-12 items-center text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-ink/80 hover:text-maroon"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="space-y-1 py-3">
                <button
                  type="button"
                  onClick={openContact}
                  className="flex min-h-11 items-center gap-3 text-[0.875rem] font-semibold text-maroon"
                >
                  <Phone size={17} aria-hidden="true" className="shrink-0" />
                  {CLINIC.phone}
                </button>

                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-start gap-3 py-2 text-[0.8125rem] leading-snug text-muted hover:text-maroon"
                >
                  <MapPin
                    size={17}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span className="min-w-0 break-words">
                    {CLINIC.address.full}
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {showContact && (
        <ContactPopup onClose={() => setShowContact(false)} />
      )}
    </>
  );
}
