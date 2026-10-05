import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Feedback from './pages/Feedback';
import Appointment from './pages/Appointment';
import ScrollToTop from './components/ScrollToTop';

const DashboardRoutes = lazy(() => import('./pages/DashboardRoutes'));

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/appointment" element={<Appointment />} />
        <Route
          path="/dashboard/*"
          element={
            <Suspense fallback={null}>
              <DashboardRoutes />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
