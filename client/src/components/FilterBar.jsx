import React, { useId } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

export default function FilterBar({ filters, setFilters, onReset, isOwnerView = false }) {
  const id = useId();
  const change = (field, value) => setFilters(previous => ({ ...previous, [field]: value, page: 1 }));

  return (
    <div className="filter-panel">
      <div className={`grid gap-4 items-end ${isOwnerView ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-[2fr_1fr_auto]'}`}>
        <div>
          <label className="field-label" htmlFor={`${id}-locality`}>
            Locality or area
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input 
              id={`${id}-locality`} 
              className="field-control pl-10" 
              type="search" 
              placeholder="Filter by city, area, or locality..." 
              value={filters.locality || ''} 
              onChange={e => change('locality', e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor={`${id}-food`}>
            Food preference
          </label>
          <select 
            id={`${id}-food`} 
            className="field-control" 
            value={filters.foodType || ''} 
            onChange={e => change('foodType', e.target.value)}
          >
            <option value="">All food categories</option>
            <option value="VEGETARIAN">🌱 Vegetarian</option>
            <option value="NON_VEGETARIAN">🍗 Non-vegetarian</option>
            <option value="OTHER">📦 Packaged / Other</option>
          </select>
        </div>

        {isOwnerView && (
          <div>
            <label className="field-label" htmlFor={`${id}-status`}>
              Donation status
            </label>
            <select 
              id={`${id}-status`} 
              className="field-control" 
              value={filters.status || ''} 
              onChange={e => change('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {['OPEN', 'CLAIMED', 'COMPLETED', 'EXPIRED', 'CANCELLED'].map(status => (
                <option key={status} value={status}>
                  {status[0] + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          className="button-quiet flex items-center justify-center gap-2" 
          onClick={onReset}
          aria-label="Reset all search filters"
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reset filters</span>
        </button>
      </div>
    </div>
  );
}
