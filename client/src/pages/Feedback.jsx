import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FormField from '../components/FormField';
import { FEEDBACK_LIMITS, validateFeedbackForm } from '../utils/validation';
import { submitFeedback } from '../services/feedbackService';
import { SITE_CONTENT } from '../utils/constants';

const EMPTY_FORM = { name: '', story: '' };

export default function Feedback() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState('idle');
  const [serverError, setServerError] = useState('');
  const { feedbackPage } = SITE_CONTENT;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateFeedbackForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSubmitState('submitting');
    setServerError('');

    try {
      await submitFeedback({ name: form.name.trim(), story: form.story.trim() });
      setSubmitState('success');
      setForm(EMPTY_FORM);
    } catch (err) {
      setSubmitState('error');
      setServerError(err?.response?.data?.message || feedbackPage.error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-8 xs:py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl px-4 xs:px-5 sm:px-7">
          <Link to="/" className="mb-5 inline-flex items-center gap-2 text-[clamp(0.7rem,1.6vw,0.75rem)] font-semibold text-maroon hover:underline">
            <ArrowLeft size={15} aria-hidden="true" />
            {feedbackPage.back}
          </Link>

          <div className="w-full rounded-3xl border border-line bg-white p-4 shadow-card xs:p-5 sm:p-8 lg:p-10">
            <div className="mb-7 text-center sm:mb-8">
              <h1 className="mb-2 text-[clamp(1.35rem,4vw,1.5rem)] font-semibold leading-tight text-maroon">{feedbackPage.title}</h1>
              <p className="text-[clamp(0.72rem,1.8vw,0.875rem)] leading-relaxed text-muted">{feedbackPage.description}</p>
            </div>

            {submitState === 'success' ? (
              <div className="py-6 text-center sm:py-8">
                <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blush text-maroon"><CheckCircle2 size={28} aria-hidden="true" /></span>
                <p className="mb-1 text-[clamp(0.85rem,2vw,1rem)] font-semibold text-ink">{feedbackPage.successTitle}</p>
                <p className="mb-6 text-[clamp(0.72rem,1.8vw,0.875rem)] leading-relaxed text-muted">{feedbackPage.successDescription}</p>
                <button type="button" onClick={() => setSubmitState('idle')} className="rounded-full border border-maroon px-5 py-2.5 text-[clamp(0.72rem,1.7vw,0.875rem)] font-semibold text-maroon transition-colors hover:bg-blush">{feedbackPage.another}</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
                <FormField id="name" label={feedbackPage.nameLabel} value={form.name} onChange={handleChange} error={errors.name} placeholder={feedbackPage.namePlaceholder} maxLength={FEEDBACK_LIMITS.name.max} />
                <FormField id="story" label={feedbackPage.storyLabel} type="textarea" value={form.story} onChange={handleChange} error={errors.story} placeholder={feedbackPage.storyPlaceholder} maxLength={FEEDBACK_LIMITS.story.max} />
                {submitState === 'error' && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] text-red-600"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{serverError}</span></div>}
                <div className="flex justify-center pt-1">
                  <button type="submit" disabled={submitState === 'submitting'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-maroon px-6 text-[clamp(0.7rem,1.7vw,0.875rem)] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-maroon-dark disabled:cursor-not-allowed disabled:opacity-60 sm:px-8">
                    <Send size={15} aria-hidden="true" />
                    {submitState === 'submitting' ? feedbackPage.submitting : feedbackPage.submit}
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
