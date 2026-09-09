export const CLINIC = {
  name: 'Sunaina Clinic',
  doctor: 'Dr. Priyanka Singh',
  qualifications: 'MBBS, PMCH | MS (Obs & Gyn)',
  phone: '+91 93342 36233',
  phoneHref: 'tel:+919334236233',
  workingHours: 'Mon - Sat, 10:00 AM - 7:00 PM',
  timezone: 'Asia/Kolkata',
  hoursNote: 'Sunday Closed',
  openingTime: 10,
  closingTime: 19,
  address: {
    full: '301 C, 3rd Floor, Sri Sai Tower, Burdwan Compound, P&T Colony, Lalpur, Ranchi, Jharkhand 834001, India',
    lines: [
      '301 C, 3rd Floor, Sri Sai Tower',
      'Burdwan Compound, P&T Colony',
      'Lalpur, Ranchi, Jharkhand 834001',
    ],
  },
};

export const SITE_CONTENT = {
  hero: {
    eyebrow: 'Experienced Care, Shaped by Global Standards',
    title: '25+ Years of Experience.',
    titleEmphasis: 'Ex-Senior Doctor,',
    titleSuffix: 'NHS England',
    description:
      "With over 25 years of global experience, former NHS England Senior Doctor Dr. Priyanka Singh, MBBS (PMCH Patna) · MS in Obstetrics & Gynaecology, provides expert, personalized care for every stage of a woman's life.",
    contact: 'Contact Us',
    directions: 'Get Directions',
    directionsLink: 'Get Directions →',
    doctorSpeciality: 'Specialized in Obstetrics and Gynaecology',
    visitTitle: 'Visit Sunaina Clinic',
    hoursTitle: 'Consultation Hours',
    teamTitle: 'Speak With Our Team',
    teamDescription: 'For appointments, enquiries and clinic information.',
  },
  doctor: {
    eyebrow: 'Meet Your Doctor',
    paragraphOne:
      'Combining elite foundational training from PMCH Patna with over 25 years of global clinical practice, including her tenure as a Senior NHS Doctor in England, Dr. Priyanka Singh brings world-class women’s healthcare home to Ranchi.',
    paragraphTwo:
      'Her practice is built around transparent communication, evidence-based medicine, and genuine empathy. From high-risk pregnancies and PCOS management to complex gynaecological care and routine wellness, every consultation provides clear guidance tailored to your specific needs.',
    highlights: [
      'MBBS (PMCH, Patna), MS (Obstetrics & Gynaecology)',
      '25+ years of clinical experience; Former Senior Doctor, National Health Service (NHS), England',
      'Personalised, patient-centred care for every stage of women’s health',
    ],
  },
  specialities: {
    title: 'Our Specialities',
    ariaLabel: 'Our specialities',
  },
  whyChooseUs: {
    title: 'Why Choose Sunaina Clinic?',
    ariaLabel: 'Why choose Sunaina Clinic',
  },
  feedback: {
    title: 'What Our Patients Say',
    share: 'Share Your Feedback',
    ariaLabel: 'Patient feedback',
    loadErrorTitle: "We couldn't load patient feedback right now",
    loadErrorDescription:
      'Please check your connection and try again in a moment.',
    retry: 'Try again',
    emptyTitle: 'No feedback shared yet',
    emptyDescription:
      'Be the first to share your experience at Sunaina Clinic.',
    latestCount: 10,
    autoplayDelay: 5000,
  },
  feedbackPage: {
    back: 'Back to Home',
    title: 'Share Your Feedback',
    description:
      'Your feedback helps us continuously improve our care and support.',
    successTitle: 'Thank you for sharing your story!',
    successDescription:
      'Your feedback has been received and will help future patients feel more confident choosing Sunaina Clinic.',
    another: 'Submit another response',
    submit: 'Submit Feedback',
    submitting: 'Submitting…',
    error:
      'Something went wrong while submitting your feedback. Please try again.',
    nameLabel: 'Your Name',
    namePlaceholder: 'Enter your full name',
    storyLabel: 'Your Story',
    storyPlaceholder: 'Tell us about your experience...',
  },
  appointment: {
    back: 'Back to Home',
    eyebrow: 'Sunaina Clinic',
    title: 'Book an Appointment',
    description: 'Schedule your consultation with our specialist.',
    preferredDate: 'Preferred Date',
    preferredTime: 'Preferred Time',
    selectDateFirst: 'Select a date first',
    loading: 'Loading...',
    selectTime: 'Select a time',
    patientDetails: 'Patient Details',
    name: 'Name',
    namePlaceholder: 'Jane Doe',
    phone: 'Phone Number',
    phonePlaceholder: '+91 98765 43210',
    email: 'Email',
    optional: '(Optional)',
    emailPlaceholder: 'jane.doe@example.com',
    booking: 'Booking...',
    confirm: 'Confirm Appointment',
    dateError: 'Please select an appointment date.',
    timeError: 'Please select an appointment time.',
    success: 'Appointment successfully booked.',
    genericError: 'Something went wrong. Please try again.',
    conflict:
      'This time slot has already been booked. Please select another time.',
  },
  contact: {
    openTitle: 'Contact the Clinic',
    closedTitle: 'Request a Callback',
    openStatus: 'Clinic is Open',
    closedStatus: 'Clinic is Closed',
    call: 'Call Clinic',
    copy: 'Copy Number',
    copied: 'Number Copied',
    divider:
      "Can't connect? Leave your number and we'll call you back.",
    name: 'Name',
    namePlaceholder: 'Enter your name',
    phone: 'Phone Number',
    phonePlaceholder: 'Enter your 10-digit mobile number',
    request: 'Request a Callback',
    sending: 'Sending...',
    emptyName: 'Please enter your name.',
    emptyPhone: 'Please enter your phone number.',
    invalidPhone: 'Please enter a valid 10-digit Indian mobile number.',
    copyError: 'Unable to copy the number.',
    callbackSuccess: 'Your callback request has been received.',
    callbackError: 'Unable to submit your request. Please try again.',
    callErrorTitle: 'Unable to make the call',
    callErrorDescription: 'No appropriate app is available to make a phone call.',
    close: 'Close',
    cancel: 'Cancel',
  },
  footer: {
    description:
      'Personalized care and support for women through different stages of life.',
    contactInfo: 'Contact Info',
  },
};

export const DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=23.375408%2C85.335911&travelmode=driving&dir_action=navigate';

export const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Specialities', href: '#specialities' },
  { label: 'About Us', href: '#about' },
  { label: 'Feedback', href: '#feedback' },
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

export const SPECIALITIES = [
  { id: 'pregnancy-care', title: 'Pregnancy Care', icon: 'Baby' },
  { id: 'normal-csection-deliveries', title: 'Normal & C-Section Deliveries', icon: 'Scissors' },
  { id: 'gynecological-care', title: 'Gynaecological Care', icon: 'CrossIcon' },
  { id: 'fertility', title: 'Fertility & Preconception Care', icon: 'Flower' },
  { id: 'pcos-hormonal-health', title: 'PCOS & Hormonal Health', icon: 'Droplet' },
  { id: 'womens-wellness', title: 'Women’s Wellness', icon: 'Stethoscope' },
];

export const WHY_CHOOSE_US = [
  { id: 'specialist-expertise', icon: 'HeartPulse', title: 'Specialist Expertise', body: 'Specialist care in obstetrics and gynaecology, supported by extensive professional training and experience within NHS England. Every aspect of care is informed by current clinical knowledge and a thoughtful understanding of each patient’s individual needs.' },
  { id: 'personalised-care', icon: 'UserRound', title: 'Personalised Care', body: 'Every consultation begins with understanding you as an individual. Your concerns, medical history and personal priorities are carefully considered to provide guidance that is relevant, thoughtful and appropriate to your circumstances.' },
  { id: 'continuity-of-care', icon: 'HeartHandshake', title: 'Continuity of Care', body: 'A personal approach to healthcare built around meaningful doctor–patient relationships. From the initial consultation through ongoing support, patients receive consistent guidance across different stages of their healthcare journey.' },
  { id: 'clear-guidance', icon: 'Compass', title: 'Clear, Informed Guidance', body: 'Healthcare decisions can sometimes feel overwhelming. Consultations focus on clear communication, practical guidance and a clear understanding of your options, helping you make informed decisions with confidence.' },
  { id: 'comprehensive-care', icon: 'Stethoscope', title: 'Comprehensive Women’s Healthcare', body: 'From routine gynaecological concerns and hormonal health to fertility, pregnancy and ongoing wellness, our approach supports women through different stages of life with consistent, thoughtful and personalised attention.' },
  { id: 'supportive-environment', icon: 'ShieldCheck', title: 'A Supportive Environment', body: 'Women’s health concerns are often deeply personal. Sunaina Clinic provides a respectful and comfortable environment where patients can speak openly, ask questions and feel supported throughout their healthcare journey.' },
];

export const UI_CONTENT = {
  primaryNavigation: 'Primary navigation',
  home: 'home',
  stars: '5 stars',
  allRightsReserved: 'All rights reserved.',
};
