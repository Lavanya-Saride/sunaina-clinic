import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FormField from '../components/FormField';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../utils/dashboard';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';

export default function DashboardLogin() {
  const { status, notice, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Staff Sign In | Sunaina Clinic';
  }, []);

  if (status === 'authenticated') {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login(email.trim(), password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Unable to sign in. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream px-4 py-8 xs:px-5 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-[clamp(0.7rem,1.6vw,0.75rem)] font-semibold text-maroon hover:underline">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Home
        </Link>

        <div className="w-full rounded-3xl border border-line bg-white p-5 shadow-card xs:p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-center">
            <img src={logo} alt="" className="h-12 w-12 shrink-0 object-contain" />
            <img src={title} alt="Sunaina Clinic" className="-ml-[6px] h-7 w-auto shrink-0 object-contain" />
          </div>

          <h1 className="mb-6 text-center text-[clamp(1.25rem,4vw,1.5rem)] font-semibold leading-tight text-maroon">Staff Sign In</h1>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormField id="email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" maxLength={254} />
            <FormField id="password" label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" maxLength={200} />

            {(error || notice) && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] leading-relaxed text-red-600">
                {error || notice}
              </div>
            )}

            <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-maroon px-6 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
