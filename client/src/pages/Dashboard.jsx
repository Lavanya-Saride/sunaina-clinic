import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, LogOut, Plus, RefreshCw } from 'lucide-react';
import AppointmentCard from '../components/dashboard/AppointmentCard';
import AppointmentFilters from '../components/dashboard/AppointmentFilters';
import OfflineAppointmentModal from '../components/dashboard/OfflineAppointmentModal';
import PaymentModal from '../components/dashboard/PaymentModal';
import StatusBadge from '../components/dashboard/StatusBadge';
import { useAuth } from '../context/useAuth';
import {
  cancelAppointment,
  confirmPayment,
  createOfflineAppointment,
  fetchAppointments,
  markAttendance,
} from '../services/dashboardService';
import { EMPTY_FILTERS, STATUS_TABS, getErrorMessage } from '../utils/dashboard';
import { createPoller } from '../utils/polling';
import { DASHBOARD_REFRESH_DEFAULT_MS, DASHBOARD_REFRESH_MIN_MS, readIntervalMs } from '../utils/pollConfig';
import logo from '../assets/images/logo.png';
import title from '../assets/images/title.png';

const PAGE_SIZE = 20;

function countActiveFilters(filters) {
  return Object.values(filters).filter(Boolean).length;
}

export default function Dashboard() {
  const { status, user, can, logout } = useAuth();
  const location = useLocation();

  const [tab, setTab] = useState('CONFIRMED');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [sortOverride, setSortOverride] = useState(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ key: '', items: [], counts: {}, pagination: { page: 1, pages: 1, total: 0 } });
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const { dateFrom, dateTo, paymentStatus, consultationType, source } = filters;
  const defaultSort = STATUS_TABS.find((item) => item.value === tab).defaultSort;
  const sort = sortOverride || defaultSort;

  useEffect(() => {
    document.title = 'Appointments | Sunaina Clinic';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(filters.search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const queryKey = useMemo(() => {
    const [sortBy, sortOrder] = sort.split(':');
    const params = { status: tab, sortBy, sortOrder, page, limit: PAGE_SIZE };
    if (search) params.search = search;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    if (consultationType) params.consultationType = consultationType;
    if (source) params.source = source;
    return JSON.stringify({ params, reloadKey });
  }, [tab, sort, page, search, dateFrom, dateTo, paymentStatus, consultationType, source, reloadKey]);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;

    const { params } = JSON.parse(queryKey);
    const intervalMs = readIntervalMs(import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL_MS, {
      fallback: DASHBOARD_REFRESH_DEFAULT_MS,
      min: DASHBOARD_REFRESH_MIN_MS,
    });
    let initial = true;

    const poller = createPoller({
      task: async (signal) => {
        const data = await fetchAppointments(params, signal, { background: !initial });
        initial = false;
        setResult({ key: queryKey, items: data.data, counts: data.counts, pagination: data.pagination });
        setLoadError('');
      },
      intervalMs,
      onError: (error, { failures }) => {
        if (initial || failures >= 2) {
          setLoadError(getErrorMessage(error, 'Unable to load appointments.'));
        }
        setResult((current) => (current.key === queryKey ? current : { ...current, key: queryKey }));
      },
    });

    poller.start();

    return () => poller.stop();
  }, [status, queryKey]);

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  const runAction = useCallback(async (appointment, action, successMessage) => {
    setBusyId(appointment.id);
    setNotice(null);

    try {
      await action();
      setNotice({ tone: 'success', text: successMessage });
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setBusyId('');
      reload();
    }
  }, [reload]);

  if (status === 'anonymous') {
    return <Navigate to="/dashboard/login" replace state={{ from: location.pathname }} />;
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream" role="status" aria-label="Loading">
        <Loader2 className="animate-spin text-maroon" size={28} />
      </div>
    );
  }

  const changeTab = (value) => {
    setTab(value);
    setSortOverride(null);
    setPage(1);
    setNotice(null);
  };

  const handleFiltersChange = (next) => {
    setFilters(next);
    if (next.search === filters.search) setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setSortOverride(null);
    setPage(1);
  };

  const handleCreate = async (payload) => {
    const created = await createOfflineAppointment(payload);
    setShowCreate(false);
    changeTab(created.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_PAYMENT');
    setNotice({ tone: 'success', text: created.status === 'CONFIRMED' ? 'Appointment created and confirmed.' : 'Appointment created. Confirm payment to complete the booking.' });
    reload();
  };

  const handleConfirmPayment = async (payload) => {
    const target = paymentTarget;
    await confirmPayment(target.id, payload);
    setPaymentTarget(null);
    setNotice({ tone: 'success', text: `Payment confirmed for ${target.fullName}.` });
    reload();
  };

  const { items, counts, pagination } = result;
  const loading = result.key !== queryKey;
  const activeFilterCount = countActiveFilters(filters) + (sortOverride ? 1 : 0);

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex min-h-[64px] w-full max-w-6xl items-center justify-between gap-3 px-3 xs:px-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center">
            <img src={logo} alt="" className="h-10 w-10 shrink-0 object-contain xs:h-12 xs:w-12" />
            <img src={title} alt="Sunaina Clinic" className="-ml-[5px] h-6 w-auto shrink-0 object-contain xs:h-7" />
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[12rem] truncate text-[0.78rem] font-semibold text-ink">{user.name}</p>
              <p className="text-[0.68rem] uppercase tracking-wide text-muted">{user.role}</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sign out" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-ink transition-colors hover:bg-blush">
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-4 px-3 py-5 xs:px-4 sm:space-y-5 sm:px-7 sm:py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.25rem,4vw,1.5rem)] font-semibold leading-tight text-maroon">Appointments</h1>
            <p className="mt-1 flex items-center gap-2 text-[0.72rem] text-muted sm:hidden">
              {user.name}
              <StatusBadge tone="brand">{user.role}</StatusBadge>
            </p>
          </div>

          <div className="flex w-full gap-3 xs:w-auto">
            <button type="button" onClick={reload} disabled={loading} aria-label="Refresh appointments" className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-blush disabled:opacity-60">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
            {can('appointments:create') && (
              <button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-maroon px-5 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-white transition-colors hover:bg-maroon-dark xs:flex-none">
                <Plus size={16} aria-hidden="true" />
                New appointment
              </button>
            )}
          </div>
        </div>

        <nav aria-label="Appointment status" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STATUS_TABS.map((item, index) => {
            const selected = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => changeTab(item.value)}
                aria-pressed={selected}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors ${index === STATUS_TABS.length - 1 ? 'col-span-2 sm:col-span-1' : ''} ${selected ? 'border-maroon bg-maroon text-white' : 'border-line bg-white text-ink hover:bg-blush'}`}
              >
                <span className="max-w-full break-words text-[clamp(0.7rem,1.6vw,0.78rem)] font-semibold leading-tight">{item.label}</span>
                <span className={`text-[0.7rem] ${selected ? 'text-white/80' : 'text-muted'}`}>{counts[item.value] ?? 0}</span>
              </button>
            );
          })}
        </nav>

        <AppointmentFilters
          filters={filters}
          sort={sort}
          activeCount={activeFilterCount}
          onFiltersChange={handleFiltersChange}
          onSortChange={(value) => {
            setSortOverride(value === defaultSort ? null : value);
            setPage(1);
          }}
          onClear={clearFilters}
        />

        {notice && (
          <div role="status" className={`rounded-xl border px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] leading-relaxed ${notice.tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'}`}>
            {notice.text}
          </div>
        )}

        {loadError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[clamp(0.7rem,1.7vw,0.875rem)] text-red-600">
            {loadError}
          </div>
        )}

        <section aria-label="Appointments" aria-busy={loading} className="space-y-3">
          {loading && items.length === 0 && (
            <div className="flex justify-center py-12" role="status" aria-label="Loading appointments">
              <Loader2 className="animate-spin text-maroon" size={26} />
            </div>
          )}

          {!loading && !loadError && items.length === 0 && (
            <div className="rounded-2xl border border-line bg-white px-4 py-10 text-center shadow-card">
              <p className="text-[clamp(0.85rem,2vw,0.95rem)] font-semibold text-ink">No appointments found</p>
              <p className="mt-1 text-[clamp(0.72rem,1.7vw,0.8rem)] text-muted">
                {activeFilterCount > 0 ? 'Try changing or clearing the filters.' : 'Nothing in this section yet.'}
              </p>
            </div>
          )}

          <div className={`grid gap-3 lg:grid-cols-2 lg:gap-4 ${loading && items.length > 0 ? 'opacity-60' : ''}`}>
            {items.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                can={can}
                busy={busyId === appointment.id}
                onConfirmPayment={setPaymentTarget}
                onAttendance={(target, attendance) =>
                  runAction(target, () => markAttendance(target.id, attendance), attendance === 'COMPLETED' ? `${target.fullName} marked as completed.` : `${target.fullName} marked as absent.`)
                }
                onCancel={(target) => runAction(target, () => cancelAppointment(target.id), `Appointment for ${target.fullName} cancelled.`)}
              />
            ))}
          </div>
        </section>

        {pagination.pages > 1 && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1 || loading} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-line bg-white px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-ink hover:bg-blush disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronLeft size={16} aria-hidden="true" />
              Prev
            </button>
            <p className="text-center text-[0.75rem] text-muted">Page {pagination.page} of {pagination.pages}</p>
            <button type="button" onClick={() => setPage((current) => Math.min(current + 1, pagination.pages))} disabled={page >= pagination.pages || loading} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-line bg-white px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-ink hover:bg-blush disabled:cursor-not-allowed disabled:opacity-50">
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </main>

      {paymentTarget && <PaymentModal appointment={paymentTarget} onClose={() => setPaymentTarget(null)} onSubmit={handleConfirmPayment} />}
      {showCreate && <OfflineAppointmentModal canRecordPayment={can('payments:confirm')} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  );
}
