import { useState } from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';
import { CLINIC, DIRECTIONS_URL, SITE_CONTENT, UI_CONTENT } from '../utils/constants';
import ContactPopup from './ContactPopup';

export default function Footer() {
  const [showContact, setShowContact] = useState(false);
  const { footer, hero } = SITE_CONTENT;

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-9 xs:px-5 sm:px-7 sm:py-12 lg:px-10">
        <div className="grid gap-9 md:grid-cols-[1fr_1fr] md:gap-16">
          <div className="min-w-0 text-center md:text-left">
            <div className="mb-4 flex items-center justify-center md:justify-start">
              <Link to="/" className="flex min-w-0 items-center" aria-label={`${CLINIC.name} home`}>
                <img src={logo} alt={`${CLINIC.name} logo`} className="h-10 w-10 shrink-0 object-contain xs:h-12 xs:w-12 sm:h-[52px] sm:w-[52px] lg:h-[56px] lg:w-[56px]" />
                <img src={title} alt={CLINIC.name} className="-ml-[5px] h-6 w-auto shrink-0 object-contain xs:h-7 sm:-ml-[8px] sm:h-8 lg:-ml-[10px] lg:h-9" />
              </Link>
            </div>

            <p className="mx-auto mb-5 max-w-sm text-[clamp(0.7rem,1.6vw,0.75rem)] leading-relaxed text-muted md:mx-0">{footer.description}</p>

            <div className="mx-auto w-full max-w-[360px] md:mx-0">
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                <button type="button" onClick={() => setShowContact(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-maroon px-3 text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg">
                  <Phone size={15} />
                  {hero.contact}
                </button>
                <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-3 text-[clamp(0.7rem,1.7vw,0.75rem)] font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md">
                  <MapPin size={15} />
                  {hero.directions}
                </a>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl md:mx-0">
            <h3 className="mb-5 text-center text-[clamp(0.8rem,1.8vw,0.875rem)] font-semibold text-ink md:text-left">{footer.contactInfo}</h3>
            <ul className="space-y-4 text-[clamp(0.68rem,1.5vw,0.75rem)] text-muted">
              <li className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-maroon"><MapPin size={17} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="min-w-0 break-words leading-relaxed pt-1">{CLINIC.address.full}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-maroon"><Phone size={16} strokeWidth={1.8} aria-hidden="true" /></span>
                <button type="button" onClick={() => setShowContact(true)} className="break-words font-medium transition-colors hover:text-maroon">{CLINIC.phone}</button>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-maroon"><Clock size={17} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="leading-relaxed pt-1"><span className="font-medium text-ink">{CLINIC.workingHours}</span><br />{CLINIC.hoursNote}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showContact && <ContactPopup onClose={() => setShowContact(false)} />}

      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 xs:px-5 sm:px-7 lg:px-10">
          <p className="text-center text-[clamp(0.58rem,1.3vw,0.625rem)] text-muted">© {new Date().getFullYear()} {CLINIC.name}. {UI_CONTENT.allRightsReserved}</p>
        </div>
      </div>
    </footer>
  );
}
