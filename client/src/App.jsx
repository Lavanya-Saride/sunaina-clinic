import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Feedback from './pages/Feedback';
import Appointment from './pages/Appointment';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/appointment" element={<Appointment />} />
      </Routes>
    </BrowserRouter>
  );
}
