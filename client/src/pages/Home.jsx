import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../sections/Hero';
import Specialities from '../sections/Specialities';
import WhyChooseUs from '../sections/WhyChooseUs';
import DoctorBio from '../sections/DoctorBio';
import PatientFeedback from '../sections/PatientFeedback';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Specialities />
        <WhyChooseUs />
        <DoctorBio />
        <PatientFeedback />
      </main>
      <Footer />
    </div>
  );
}
