import React from 'react';

export default function DonationCard({ donation, onSelect }) {
  const formatTimeRemaining = (deadline) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  const getFoodTypeBadge = (type) => {
    switch (type) {
      case 'VEGETARIAN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            🌱 Vegetarian
          </span>
        );
      case 'NON_VEGETARIAN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            🍗 Non-Vegetarian
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            📦 Packaged / Other
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Open for Pickup</span>;
      case 'CLAIMED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Claimed</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Completed</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Expired</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const isUrgent = new Date(donation.pickupDeadline).getTime() - Date.now() < 3 * 3600 * 1000;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {getFoodTypeBadge(donation.foodType)}
            {getStatusBadge(donation.status)}
          </div>
          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {donation.quantity} {donation.unit}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">
          {donation.title}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-2 mb-4">
          {donation.description}
        </p>

        {/* Organization & Locality */}
        <div className="flex items-center text-xs text-slate-500 mb-2">
          <svg className="w-4 h-4 mr-1 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-medium text-slate-700 truncate">
            {donation.donorOrganization?.name || 'Approved Donor'}
          </span>
          <span className="mx-1 text-slate-300">•</span>
          <span className="text-slate-600 truncate">
            {donation.donorOrganization?.locality || 'Locality'}
          </span>
        </div>

        {/* Time Remaining */}
        <div className={`flex items-center text-xs font-medium ${isUrgent ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-50'} px-2.5 py-1.5 rounded-lg`}>
          <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Pickup: {formatTimeRemaining(donation.pickupDeadline)}</span>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Posted {new Date(donation.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onSelect(donation.id)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center"
        >
          View Details &rarr;
        </button>
      </div>
    </div>
  );
}
