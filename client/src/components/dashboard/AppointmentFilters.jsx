import { Search } from 'lucide-react';
import FormField from '../FormField';
import { SORT_OPTIONS } from '../../utils/dashboard';

export default function AppointmentFilters({ filters, sort, onFiltersChange, onSortChange }) {
  const update = (name) => (event) => onFiltersChange({ ...filters, [name]: event.target.value });

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

        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label="Sort appointments"
          className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-cream/60 px-3.5 text-[clamp(0.8rem,2vw,0.875rem)] text-ink focus:border-maroon focus:bg-white focus:outline-none focus:ring-2 focus:ring-maroon/30 sm:w-64"
        >
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
        <FormField id="filter-dateFrom" label="From date" type="date" value={filters.dateFrom} onChange={update('dateFrom')} required={false} />
        <FormField id="filter-dateTo" label="To date" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={update('dateTo')} required={false} />
      </div>
    </section>
  );
}
