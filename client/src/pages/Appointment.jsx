import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AppointmentForm from '../components/AppointmentForm';

export default function Appointment() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-cream py-10 sm:py-14 lg:py-16">
        <AppointmentForm />
      </main>

      <Footer />
    </>
  );
}