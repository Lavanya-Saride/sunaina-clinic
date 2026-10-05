import { useState } from 'react';
import { ListFilter, Search, X } from 'lucide-react';
import FormField from '../FormField';
import {
  CONSULTATION_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SORT_OPTIONS,
  SOURCE_OPTIONS,
  getIndianToday,
} from '../../utils/dashboard';

const ghostButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[clamp(0.72rem,1.7vw,0.8rem)] font-semibold text-ink transition-colors hover:bg-blush';

export default function AppointmentFilters({ filters, sort, activeCount, onFiltersChange, onSortChange, onClear }) {
  const [open, setOpen] = useState(false);

  const update = (name) => (event) => onFiltersChange({ ...filters, [name]: event.target.value });

  const setToday = () => {
    const today = getIndianToday();
    onFiltersChange({ ...filters, dateFrom: today, dateTo: today });
  };

  return (
    <section aria-label="Filter and sort appointments" className="space-y-3 rounded-2xl border border-line bg-white p-3 shadow-card xs:p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative min-w-0">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={update('search')}
            placeholder="Search name or phone"
            aria-label="Search appointments"
            maxLength={100}
            className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-cream/60 py-3 pl-10 pr-3.5 text-[clamp(0.8rem,2vw,0.875rem)] text-ink placeholder:text-muted focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3 sm:flex">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Sort appointments"
            className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-cream/60 px-3.5 text-[clamp(0.8rem,2vw,0.875rem)] text-ink focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30 sm:w-64"
          >
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="appointment-filter-panel"
            className={`${ghostButton} lg:hidden`}
          >
            <ListFilter size={16} aria-hidden="true" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>

      <div id="appointment-filter-panel" className={`${open ? 'grid' : 'hidden'} gap-3 border-t border-line pt-3 xs:grid-cols-2 lg:grid lg:grid-cols-4`}>
        <FormField id="filter-dateFrom" label="From date" type="date" value={filters.dateFrom} onChange={update('dateFrom')} required={false} />
        <FormField id="filter-dateTo" label="To date" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={update('dateTo')} required={false} />
        <FormField id="filter-paymentStatus" label="Payment" type="select" placeholder="All payments" value={filters.paymentStatus} onChange={update('paymentStatus')} options={PAYMENT_STATUS_OPTIONS} required={false} />
        <FormField id="filter-consultationType" label="Consultation" type="select" placeholder="All types" value={filters.consultationType} onChange={update('consultationType')} options={CONSULTATION_OPTIONS} required={false} />
        <FormField id="filter-source" label="Patient source" type="select" placeholder="All sources" value={filters.source} onChange={update('source')} options={SOURCE_OPTIONS} required={false} />

        <div className="grid grid-cols-2 items-end gap-3 xs:col-span-2 lg:col-span-3">
          <button type="button" onClick={setToday} className={ghostButton}>Today</button>
          <button type="button" onClick={onClear} disabled={activeCount === 0} className={`${ghostButton} disabled:cursor-not-allowed disabled:opacity-50`}>
            <X size={15} aria-hidden="true" />
            Clear filters
          </button>
        </div>
      </div>
    </section>
  );
}
