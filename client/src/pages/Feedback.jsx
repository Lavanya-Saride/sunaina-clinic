import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FormField from '../components/FormField';
import { SERVICE_OPTIONS } from '../utils/constants';
import { FEEDBACK_LIMITS, validateFeedbackForm } from '../utils/validation';
import { submitFeedback } from '../services/feedbackService';

const EMPTY_FORM = { name: '', service: '', story: '' };

export default function Feedback() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState('idle');
  const [serverError, setServerError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateFeedbackForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitState('submitting');
    setServerError('');
    try {
      await submitFeedback({
        name: form.name.trim(),
        service: form.service,
        story: form.story.trim(),
      });
      setSubmitState('success');
      setForm(EMPTY_FORM);
    } catch (err) {
      setSubmitState('error');
      setServerError(
        err?.response?.data?.message || 'Something went wrong while submitting your feedback. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-5 sm:px-7">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-maroon mb-5 hover:underline"><ArrowLeft size={15} aria-hidden="true" />Back to Home</Link>
          <div className="bg-white border border-line rounded-3xl shadow-card p-5 sm:p-8 lg:p-10">
            <div className="text-center mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold text-maroon mb-2">Share Your Feedback</h1>
              <p className="text-xs sm:text-sm text-muted">
                Your feedback helps us continuously improve our care and support.
              </p>
            </div>

            {submitState === 'success' ? (
              <div className="text-center py-8">
                <span className="inline-flex w-14 h-14 rounded-full bg-blush items-center justify-center text-maroon mb-4">
                  <CheckCircle2 size={28} aria-hidden="true" />
                </span>
                <p className="font-semibold text-ink mb-1">Thank you for sharing your story!</p>
                <p className="text-xs sm:text-sm text-muted mb-6">
                  Your feedback has been received and will help future patients feel more confident
                  choosing Sunaina Clinic.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitState('idle')}
                  className="text-sm font-semibold text-maroon border border-maroon rounded-full px-5 py-2.5 hover:bg-blush transition-colors"
                >
                  Submit another response
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    id="name"
                    label="Your Name"
                    value={form.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="Enter your full name"
                    maxLength={FEEDBACK_LIMITS.name.max}
                  />
                  <FormField
                    id="service"
                    label="Service Category"
                    type="select"
                    value={form.service}
                    onChange={handleChange}
                    error={errors.service}
                    options={SERVICE_OPTIONS}
                  />
                </div>

                <FormField
                  id="story"
                  label="Your Story"
                  type="textarea"
                  value={form.story}
                  onChange={handleChange}
                  error={errors.story}
                  placeholder="Tell us about your experience..."
                  maxLength={FEEDBACK_LIMITS.story.max}
                />

                {submitState === 'error' && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{serverError}</span>
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={submitState === 'submitting'}
                    className="inline-flex items-center gap-2 bg-maroon hover:bg-maroon-dark disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold tracking-wide uppercase px-8 py-3.5 rounded-full transition-colors"
                  >
                    <Send size={15} aria-hidden="true" />
                    {submitState === 'submitting' ? 'Submitting…' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
