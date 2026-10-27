import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import DonationCard from '../components/DonationCard';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';

export default function BrowseDonationsPage({ onSelectDonation, isOwnerView = false, isClaimsView = false }) {
  const [donations, setDonations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 9,
    locality: '',
    foodType: '',
    status: isOwnerView || isClaimsView ? '' : 'OPEN',
    my: isOwnerView ? 'true' : 'false',
    claims: isClaimsView ? 'true' : 'false'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDonations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDonations(filters);
      if (res.success) {
        setDonations(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load surplus food offers');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 9,
      locality: '',
      foodType: '',
      status: isOwnerView || isClaimsView ? '' : 'OPEN',
      my: isOwnerView ? 'true' : 'false',
      claims: isClaimsView ? 'true' : 'false'
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageTitle = isOwnerView
    ? 'My donations'
    : isClaimsView
    ? 'My pickups'
    : 'Good food. Another chance to be shared.';

  const pageSubtitle = isOwnerView
    ? 'Track, inspect, and update surplus food offers posted by your organization.'
    : isClaimsView
    ? 'Surplus food contributions claimed by your NGO awaiting pickup verification or completed.'
    : 'Find surplus food in your area. Approved organizations can reserve a donation and arrange pickup before its deadline.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className={isOwnerView || isClaimsView ? 'mb-8' : 'feed-intro'}>
        <h1 className="feed-title">
          {pageTitle}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 mt-4 max-w-2xl">
          {pageSubtitle}
        </p>
      </div>

      {/* Filter Component */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onReset={handleResetFilters}
        isOwnerView={isOwnerView || isClaimsView}
      />

      {/* Error Alert */}
      {error && (
        <div role="alert" className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4 text-sm text-red-700">
          <div className="flex items-center space-x-2">
            <span className="font-bold">Error:</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDonations}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {!isLoading && !error && <p className="mb-5 text-sm text-slate-600" role="status">{pagination.total} {pagination.total === 1 ? 'donation' : 'donations'}{!isOwnerView && !isClaimsView ? ' available for pickup' : ''}</p>}
      {error ? null : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-4 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-2/3 mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : donations.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No surplus offers found</h3>
          <p className="text-sm leading-relaxed text-slate-600 mb-6">
            {isOwnerView
              ? "Your organization hasn't published any donations matching these criteria."
              : isClaimsView
              ? "Your NGO hasn't claimed any surplus donations matching these criteria."
              : 'There are currently no active surplus donations matching your filter criteria.'}
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        /* Results Grid */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {donations.map((item) => (
              <DonationCard
                key={item.id}
                donation={item}
                onSelect={onSelectDonation}
              />
            ))}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
