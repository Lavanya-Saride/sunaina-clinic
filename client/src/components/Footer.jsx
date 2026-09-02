import { useState } from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';
import { CLINIC, DIRECTIONS_URL } from '../utils/constants';
import ContactPopup from './ContactPopup';

export default function Footer() {
  const [showContact, setShowContact] = useState(false);

  return (
    <footer className="bg-white border-t border-line">
      <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10 py-10 sm:py-12">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-4">
              <Link
                to="/"
                className="flex items-center"
                aria-label="Sunaina Clinic home"
              >
                <img
                  src={logo}
                  alt="Sunaina Clinic logo"
                  className="w-12 h-12 sm:w-[52px] sm:h-[52px] lg:w-[56px] lg:h-[56px] object-contain shrink-0"
                />

                <img
                  src={title}
                  alt="Sunaina Clinic"
                  className="-ml-[6px] sm:-ml-[8px] lg:-ml-[10px] h-7 sm:h-8 lg:h-9 w-auto object-contain shrink-0"
                />
              </Link>
            </div>

            <p className="text-xs text-muted max-w-sm mx-auto md:mx-0 leading-relaxed mb-5">
              Personalized care and support for women through different stages
              of life.
            </p>

            <div className="w-full max-w-[360px] mx-auto md:mx-0">
              <Link
                to="/appointment"
                className="flex items-center justify-center w-full bg-maroon text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
              >
                Book an Appointment
              </Link>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="inline-flex items-center justify-center border border-maroon text-maroon text-xs font-semibold px-3 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
                >
                  Contact Us
                </button>

                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white border border-line text-ink text-xs font-semibold px-3 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
                >
                  Get Directions
                </a>
              </div>
            </div>
          </div>

          <div className="max-w-xl mx-auto md:mx-0">
            <h3 className="text-sm font-semibold text-ink mb-5 text-center md:text-left">
              Contact Info
            </h3>

            <ul className="space-y-4 text-xs text-muted">
              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
                  <MapPin
                    size={17}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>

                <span className="leading-relaxed pt-1">
                  301 C, 3rd Floor, Sri Sai Tower
                  <br />
                  Burdwan Compound, P&amp;T Colony
                  <br />
                  Lalpur, Ranchi, Jharkhand 834001
                </span>
              </li>

              <li className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
                  <Phone
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>

                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="font-medium transition-colors hover:text-maroon"
                >
                  {CLINIC.phone}
                </button>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-blush flex items-center justify-center text-maroon shrink-0">
                  <Clock
                    size={17}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>

                <span className="leading-relaxed pt-1">
                  <span className="font-medium text-ink">
                    {CLINIC.hours}
                  </span>

                  {CLINIC.hoursNote && (
                    <>
                      <br />
                      <span>{CLINIC.hoursNote}</span>
                    </>
                  )}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showContact && (
        <ContactPopup onClose={() => setShowContact(false)} />
      )}

      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-7 lg:px-10 py-5">
          <p className="text-center text-[10px] text-muted">
            © {new Date().getFullYear()} {CLINIC.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}