import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';
import { CLINIC, NAV_LINKS, SITE_CONTENT, UI_CONTENT } from '../utils/constants';
import ContactPopup from '../components/ContactPopup';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur transition-shadow duration-300 ${isScrolled ? 'shadow-card' : ''}`}>
        <div className="mx-auto w-full max-w-6xl px-3 xs:px-4 sm:px-7 lg:px-10">
          <div className="flex min-h-[64px] items-center justify-between gap-3 sm:min-h-[74px]">
            <Link to="/" className="group flex min-w-0 shrink items-center" aria-label={`${CLINIC.name} ${UI_CONTENT.home}`}>
              <img src={logo} alt={SITE_CONTENT.hero.visitTitle} className="h-10 w-10 shrink-0 object-contain xs:h-12 xs:w-12 sm:h-[52px] sm:w-[52px] lg:h-[56px] lg:w-[56px]" />
              <img src={title} alt={SITE_CONTENT.hero.visitTitle} className="-ml-[5px] h-6 w-auto shrink-0 object-contain xs:h-7 sm:-ml-[8px] sm:h-8 lg:-ml-[10px] lg:h-9" />
            </Link>

            <nav className="hidden min-w-0 items-center gap-5 md:flex lg:gap-8" aria-label={UI_CONTENT.primaryNavigation}>
              {NAV_LINKS.map((link) => <a key={link.href} href={`/${link.href}`} className="whitespace-nowrap py-1 text-[clamp(0.6rem,1.2vw,0.75rem)] font-medium uppercase tracking-[0.1em] text-ink/80 transition hover:text-maroon">{link.label}</a>)}
            </nav>

            <button type="button" onClick={() => setShowContact(true)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-maroon px-3 text-[clamp(0.65rem,1.8vw,0.875rem)] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg xs:gap-2 xs:px-4 sm:px-5">
              <Phone size={15} />
              {SITE_CONTENT.hero.contact}
            </button>
          </div>
        </div>
      </header>

      {showContact && <ContactPopup onClose={() => setShowContact(false)} />}
    </>
  );
}
