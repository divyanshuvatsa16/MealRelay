import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import EditDonationModal from '../components/EditDonationModal';
import CancelDonationModal from '../components/CancelDonationModal';

export default function DonationDetailPage({ donationId, onBack }) {
  const { user, isNgo, isDonor, isApproved } = useAuth();
  const [donation, setDonation] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action states
  const [isEditing, setIsEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');

  // Pickup verification input for NGO
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDonationById(donationId);
      if (res.success) {
        setDonation(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load donation details');
    } finally {
      setIsLoading(false);
    }
  }, [donationId]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.getDonationHistory(donationId);
      if (res.success) {
        setHistory(res.data);
      }
    } catch (err) {
      // Non-critical if history fails for unauthenticated/partial view
      console.warn('History fetch:', err.message);
    }
  }, [donationId]);

  useEffect(() => {
    fetchDetail();
    fetchHistory();
  }, [fetchDetail, fetchHistory]);

  const handleClaim = async () => {
    setClaimError('');
    setIsClaiming(true);
    try {
      const res = await api.claimDonation(donationId);
      if (res.success) {
        setDonation(res.data);
        fetchHistory();
      }
    } catch (err) {
      setClaimError(err.message || 'Failed to claim donation');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleVerifyPickup = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifySuccess('');

    if (!verificationCode || verificationCode.trim().length < 4) {
      setVerifyError('Please enter the 6-digit pickup code given by the donor.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.verifyPickup(donationId, verificationCode.trim());
      if (res.success) {
        setVerifySuccess('Pickup verified successfully! This donation is now COMPLETED.');
        setDonation(res.data);
        fetchHistory();
      }
    } catch (err) {
      setVerifyError(err.message || 'Invalid or expired pickup code');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-20 bg-slate-100 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            ✕
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Cannot Load Offer</h2>
          <p className="text-xs text-slate-600 mb-6">{error || 'Offer not found or access restricted.'}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            &larr; Return to Browse Feed
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.organizationId === donation.donorOrganizationId || user?.role === 'ADMIN';
  const isClaimer = user?.organizationId === donation.claimedByOrganizationId;
  const canEdit = isOwner && donation.status === 'OPEN';
  const canCancel = (isOwner || isClaimer) && ['OPEN', 'CLAIMED'].includes(donation.status);

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar with Back and Actions */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
        >
          &larr; Back to Listings
        </button>

        <div className="flex items-center space-x-2">
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Offer
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => setIsCancelling(true)}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              Cancel {isClaimer ? 'Reservation' : 'Offer'}
            </button>
          )}
        </div>
      </div>

      {/* Main Detail Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {/* Banner with status and category */}
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                donation.status === 'OPEN'
                  ? 'bg-emerald-100 text-emerald-800'
                  : donation.status === 'CLAIMED'
                  ? 'bg-blue-100 text-blue-800'
                  : donation.status === 'COMPLETED'
                  ? 'bg-purple-100 text-purple-800'
                  : donation.status === 'EXPIRED'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Status: {donation.status}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              Category: {donation.foodType}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Quantity: {donation.quantity} {donation.unit}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            {donation.title}
          </h1>

          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {donation.description}
          </p>
        </div>

        {/* WORKFLOW SECTION: CLAIMING FOR NGO */}
        {donation.status === 'OPEN' && isNgo && (
          <div className="p-6 sm:p-8 bg-emerald-50/50 border-b border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Ready to Coordinate Collection?
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Claiming reserves this surplus food package exclusively for your NGO shelter.
                </p>
              </div>

              {isApproved ? (
                <button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 shrink-0"
                >
                  {isClaiming ? 'Reserving Offer...' : 'Claim Surplus Food'}
                </button>
              ) : (
                <div className="text-xs font-medium text-amber-800 bg-amber-100 px-3 py-2 rounded-lg border border-amber-200">
                  ⚠️ Organization Approval Pending — Cannot claim yet
                </div>
              )}
            </div>

            {claimError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {claimError}
              </div>
            )}
          </div>
        )}

        {/* WORKFLOW SECTION: DONOR SECURE HANDOVER CODE VIEW */}
        {donation.status === 'CLAIMED' && isOwner && (
          <div className="p-6 sm:p-8 bg-blue-50/60 border-b border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Handover Verification Code
                </span>
                <p className="text-xs text-blue-800 mt-0.5">
                  Reserved by <span className="font-bold">{donation.claimedByOrganization?.name || 'Approved NGO'}</span>. Communicate this 6-digit code during in-person handoff:
                </p>
              </div>

              <div className="bg-white border-2 border-blue-500 rounded-2xl px-6 py-2.5 shadow-sm text-center">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-widest text-blue-700 font-mono">
                  {donation.pickupCode || '••••••'}
                </span>
                <span className="block text-[10px] text-blue-500 font-medium">Single-use PIN</span>
              </div>
            </div>
            <p className="text-[11px] text-blue-700 italic">
              ℹ️ The claiming organization must enter this code upon collection to finalize the completed audit transfer.
            </p>
          </div>
        )}

        {/* WORKFLOW SECTION: NGO PICKUP VERIFICATION */}
        {donation.status === 'CLAIMED' && isClaimer && (
          <div className="p-6 sm:p-8 bg-indigo-50/50 border-b border-indigo-200">
            <h3 className="text-sm font-bold text-indigo-950 mb-1">
              Complete Pickup at Collection
            </h3>
            <p className="text-xs text-indigo-800 mb-4">
              Enter the 6-digit handover code provided by the donor at collection point to verify handoff.
            </p>

            {verifySuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                ✓ {verifySuccess}
              </div>
            )}

            {verifyError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerifyPickup} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-48 text-center text-lg font-mono font-bold tracking-widest px-3 py-2 bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Complete Pickup'}
              </button>
            </form>
          </div>
        )}

        {/* Timelines and Schedule */}
        <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Critical Food Safety & Pickup Schedule
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Prepared At
              </span>
              <span className="text-sm font-bold text-slate-800">
                {formatDateTime(donation.preparedAt)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide block mb-1">
                Pickup Deadline
              </span>
              <span className="text-sm font-bold text-amber-900">
                {formatDateTime(donation.pickupDeadline)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Consume By
              </span>
              <span className="text-sm font-bold text-slate-800">
                {formatDateTime(donation.consumeBy)}
              </span>
            </div>
          </div>
        </div>

        {/* Organizations Involved */}
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Food Donor Organization
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {donation.donorOrganization?.name || 'Verified Food Donor'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {donation.donorOrganization?.address}, {donation.donorOrganization?.locality}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Claiming Community Organization
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {donation.claimedByOrganization?.name || (donation.status === 'OPEN' ? 'Not yet claimed' : 'None')}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {donation.claimedByOrganization?.locality || (donation.status === 'OPEN' ? 'Open for collection' : '—')}
            </p>
          </div>
        </div>

        {/* Audit Log Timeline */}
        {history.length > 0 && (
          <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Audit Trail & History
            </h2>
            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
              {history.map((evt) => (
                <div key={evt.id} className="relative">
                  <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-200"></span>
                  <div className="text-xs font-bold text-slate-800">
                    {evt.action.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(evt.createdAt).toLocaleString()} • Actor:{' '}
                    <span className="font-medium text-slate-700">
                      {evt.actorUser?.name || 'System Scheduler'}
                    </span>{' '}
                    ({evt.actorUser?.role || 'SYSTEM'})
                  </div>
                  {evt.metadata?.reason && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mt-1 inline-block">
                      Note: "{evt.metadata.reason}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditDonationModal
          donation={donation}
          onClose={() => setIsEditing(false)}
          onUpdated={(updated) => {
            setDonation(updated);
            setIsEditing(false);
            fetchHistory();
          }}
        />
      )}

      {/* Cancel Modal */}
      {isCancelling && (
        <CancelDonationModal
          donation={donation}
          onClose={() => setIsCancelling(false)}
          onCancelled={(updated) => {
            setDonation(updated);
            setIsCancelling(false);
            fetchHistory();
          }}
        />
      )}
    </div>
  );
}
