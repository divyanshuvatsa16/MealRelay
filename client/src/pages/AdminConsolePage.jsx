import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function AdminConsolePage({ onNavigateHome }) {
  const { user, isAdmin } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [filterStatus, setFilterStatus] = useState('PENDING'); // PENDING, APPROVED, REJECTED, ''
  const [filterType, setFilterType] = useState(''); // DONOR, NGO, ''
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Rejection Modal State
  const [rejectingOrg, setRejectingOrg] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setActionError('');
    try {
      const params = {
        page: pagination.page,
        limit: 20
      };
      if (filterStatus) params.approvalStatus = filterStatus;
      if (filterType) params.type = filterType;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.getOrganizations(params);
      if (res.success) {
        setOrganizations(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setActionError(err.message || 'Failed to load organizations for review.');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, filterStatus, filterType, searchTerm, pagination.page]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Handle Approve
  const handleApprove = async (org) => {
    if (!window.confirm(`Are you sure you want to approve "${org.name}" as an active ${org.type} organization?`)) {
      return;
    }

    setProcessingId(org.id);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.updateOrganizationApproval(org.id, { approvalStatus: 'APPROVED' });
      if (res.success) {
        setActionSuccess(`Organization "${org.name}" has been successfully approved.`);
        fetchOrganizations();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to approve organization.');
    } finally {
      setProcessingId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (org) => {
    setRejectingOrg(org);
    setRejectionReason('Physical address or organization details could not be verified.');
  };

  // Close Reject Modal
  const closeRejectModal = () => {
    setRejectingOrg(null);
    setRejectionReason('');
    setIsSubmittingReject(false);
  };

  // Confirm Reject
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingOrg) return;

    setIsSubmittingReject(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.updateOrganizationApproval(rejectingOrg.id, {
        approvalStatus: 'REJECTED',
        reason: rejectionReason.trim()
      });

      if (res.success) {
        setActionSuccess(`Organization "${rejectingOrg.name}" has been rejected.`);
        closeRejectModal();
        fetchOrganizations();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to update organization status.');
      setIsSubmittingReject(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-600 mb-6">
          The Organization Administration Console is restricted to authorized platform administrators.
        </p>
        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          Return to Browse
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Organization Verification Console
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Review and manage food donor and community relief NGO credentials to maintain platform safety and trust.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchOrganizations()}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors inline-flex items-center"
            >
              <svg className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh List
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center space-x-2">
            <span className="text-base">✓</span>
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess('')}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800 font-medium">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚠️</span>
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError('')}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'PENDING'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === ''
                ? 'bg-slate-200 text-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Records
          </button>
        </div>

        {/* Search & Type Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-700"
          >
            <option value="">All Types</option>
            <option value="DONOR">Donors</option>
            <option value="NGO">NGOs</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search by name or locality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 pr-8 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Organizations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">No organizations found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {filterStatus
              ? `There are currently no organizations matching status "${filterStatus}".`
              : 'No organization records found matching your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => {
            const primaryMember = org.members?.[0]?.user;
            const isProcessing = processingId === org.id;

            return (
              <div
                key={org.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Basic Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {org.name}
                      </h2>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          org.type === 'DONOR'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {org.type === 'DONOR' ? 'Food Donor' : 'Community NGO'}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          org.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : org.approvalStatus === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}
                      >
                        {org.approvalStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-700">Locality: </span>
                        {org.locality}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Address: </span>
                        {org.address}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Registered: </span>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Applicant & Activity details */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                      {primaryMember && (
                        <span>
                          <span className="font-semibold text-slate-700">Contact:</span>{' '}
                          {primaryMember.name} ({primaryMember.email})
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        <span className="font-semibold text-slate-700">Platform Activity:</span>{' '}
                        {org.type === 'DONOR'
                          ? `${org._count?.donationsCreated || 0} batches published`
                          : `${org._count?.donationsClaimed || 0} batches claimed`}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 self-end lg:self-center">
                    {org.approvalStatus !== 'APPROVED' && (
                      <button
                        onClick={() => handleApprove(org)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                      >
                        {isProcessing ? 'Saving...' : '✓ Approve'}
                      </button>
                    )}

                    {org.approvalStatus !== 'REJECTED' && (
                      <button
                        onClick={() => openRejectModal(org)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    )}

                    {org.approvalStatus === 'APPROVED' && (
                      <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                        Active & Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Reject Organization Application
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the rationale for rejecting <span className="font-semibold text-slate-800">{rejectingOrg.name}</span>. This reason will be logged in the permanent audit trail.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Rejection Reason / Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Physical premises could not be verified; duplicate account; inauthentic registration."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Reason Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Physical address could not be verified',
                    'Ineligible organization entity type',
                    'Duplicate account detected',
                    'Incomplete registration details'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={isSubmittingReject}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmittingReject ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
