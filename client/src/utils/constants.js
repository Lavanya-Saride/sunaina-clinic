export const CLINIC = {
  name: 'Sunaina Clinic',
  doctor: 'Dr. Priyanka Singh',
  phone: '+91 93342 36233',
  phoneHref: 'tel:+919334236233',
  hours: '10:00 AM - 7:00 PM',
  hoursNote: 'Sunday Closed',
  address: {
    full: '301 C, 3rd Floor, Sri Sai Tower, Burdwan Compound, P&T Colony, Lalpur, Ranchi, Jharkhand 834001, India'
  }
};

export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CLINIC.address.full)}`;

export const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Specialities', href: '#specialities' },
  { label: 'About Us', href: '#about' },
  { label: 'Feedback', href: '#feedback' }
];

export const TIME_SLOTS = [
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
];
