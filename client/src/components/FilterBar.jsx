import React from 'react';

export default function FilterBar({ filters, setFilters, onReset, isOwnerView = false }) {
  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: 1 // reset to first page on filter change
    }));
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Locality Search */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / Area</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Downtown, Uptown..."
              value={filters.locality || ''}
              onChange={(e) => handleChange('locality', e.target.value)}
              className="w-full text-xs sm:text-sm pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Food Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Food Category</label>
          <select
            value={filters.foodType || ''}
            onChange={(e) => handleChange('foodType', e.target.value)}
            className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          >
            <option value="">All Categories</option>
            <option value="VEGETARIAN">🌱 Vegetarian</option>
            <option value="NON_VEGETARIAN">🍗 Non-Vegetarian</option>
            <option value="OTHER">📦 Packaged / Other</option>
          </select>
        </div>

        {/* Status Filter (Relevant for Donors viewing their history) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={!isOwnerView}
            className={`w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white ${
              !isOwnerView ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isOwnerView ? (
              <>
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="CLAIMED">Claimed</option>
                <option value="COMPLETED">Completed</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </>
            ) : (
              <option value="OPEN">Open (Default)</option>
            )}
          </select>
        </div>

        {/* Reset / Actions */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            className="w-full text-xs sm:text-sm py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
