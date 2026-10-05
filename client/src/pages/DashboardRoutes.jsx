import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Dashboard from './Dashboard';
import DashboardLogin from './DashboardLogin';

export default function DashboardRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="login" element={<DashboardLogin />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
