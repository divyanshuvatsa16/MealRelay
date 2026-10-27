import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function DashboardPage({ setView, onSelectDonation }) {
  const { user, organization, isDonor, isNgo, isApproved } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentOffers, setRecentOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch real database summary
    setIsLoading(true);
    api.getDashboardSummary()
      .then((res) => {
        if (res.success) {
          setDashboardData(res.data);
        }
      })
      .catch((err) => {
        setError(err.message || 'Could not load dashboard statistics');
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Fetch recent active donations
    api.getDonations({ limit: 4 })
      .then((res) => {
        if (res.success) {
          setRecentOffers(res.data || []);
        }
      })
      .catch(() => {});
  }, []);

  const metrics = dashboardData?.metrics || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {organization?.approvalStatus || 'PENDING'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Affiliated with <span className="font-semibold text-slate-800">{organization?.name}</span> ({organization?.type}) in{' '}
              <span className="font-semibold text-slate-800">{organization?.locality}</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setView('admin')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Review Organizations
              </button>
            )}
            {isDonor && isApproved && (
              <button
                onClick={() => setView('create-donation')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                + Post Surplus
              </button>
            )}
            {isNgo && (
              <button
                onClick={() => setView('my-claims')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                My Reservations
              </button>
            )}
            <button
              onClick={() => setView('browse')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              Browse Feed
            </button>
          </div>
        </div>
      </div>

      {/* Verification Notice: Pending */}
      {organization?.approvalStatus === 'PENDING' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start space-x-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Organization Verification Pending
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              Your organization registration is currently under review by platform administrators. While pending, you may browse active offers in discovery mode. You will be able to {isDonor ? 'publish surplus food' : 'claim food offers'} once verified.
            </p>
          </div>
        </div>
      )}

      {/* Verification Notice: Rejected */}
      {organization?.approvalStatus === 'REJECTED' && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start space-x-3">
          <span className="text-xl">🛑</span>
          <div>
            <h3 className="text-sm font-bold text-rose-900">
              Organization Verification Declined
            </h3>
            <p className="text-xs text-rose-800 mt-0.5">
              Your organization registration could not be verified by platform administrators. You cannot {isDonor ? 'publish food batches' : 'claim donations'}. If you believe this is in error, please contact platform operations at support@mealrelay.org to request re-evaluation.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Dynamic Database Derived Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : isDonor ? (
        /* DONOR ROLE METRICS */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Total Created
            </span>
            <div className="text-2xl font-extrabold text-slate-900">{metrics.totalCreated ?? 0}</div>
            <span className="text-[10px] text-slate-500">All-time packages</span>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-2xs bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block mb-1">
              Currently Open
            </span>
            <div className="text-2xl font-extrabold text-emerald-600">{metrics.openCount ?? 0}</div>
            <span className="text-[10px] text-emerald-700">Active for claim</span>
          </div>

          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs bg-blue-50/20">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide block mb-1">
              Awaiting Pickup
            </span>
            <div className="text-2xl font-extrabold text-blue-600">{metrics.claimedCount ?? 0}</div>
            <span className="text-[10px] text-blue-700">Reserved by NGOs</span>
          </div>

          <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-2xs bg-purple-50/20">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide block mb-1">
              Completed Handoffs
            </span>
            <div className="text-2xl font-extrabold text-purple-600">{metrics.completedCount ?? 0}</div>
            <span className="text-[10px] text-purple-700">Verified handoffs</span>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs bg-amber-50/20">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block mb-1">
              Expired
            </span>
            <div className="text-2xl font-extrabold text-amber-600">{metrics.expiredCount ?? 0}</div>
            <span className="text-[10px] text-amber-700">Unclaimed deadlines</span>
          </div>

          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-2xs bg-rose-50/20">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide block mb-1">
              Cancelled
            </span>
            <div className="text-2xl font-extrabold text-rose-600">{metrics.cancelledCount ?? 0}</div>
            <span className="text-[10px] text-rose-700">Voided offers</span>
          </div>
        </div>
      ) : isNgo ? (
        /* NGO ROLE METRICS */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Available in Feed
            </span>
            <div className="text-2xl font-extrabold text-slate-900">{metrics.availableOpen ?? 0}</div>
            <span className="text-[10px] text-slate-500">Open for reservation</span>
          </div>

          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs bg-blue-50/20">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide block mb-1">
              Active Reservations
            </span>
            <div className="text-2xl font-extrabold text-blue-600">{metrics.activeClaims ?? 0}</div>
            <span className="text-[10px] text-blue-700">Claimed & awaiting pickup</span>
          </div>

          <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-2xs bg-purple-50/20">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide block mb-1">
              Completed Pickups
            </span>
            <div className="text-2xl font-extrabold text-purple-600">{metrics.completedPickups ?? 0}</div>
            <span className="text-[10px] text-purple-700">Recorded handoffs</span>
          </div>

          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-2xs bg-rose-50/20">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide block mb-1">
              Cancelled Claims
            </span>
            <div className="text-2xl font-extrabold text-rose-600">{metrics.cancelledClaims ?? 0}</div>
            <span className="text-[10px] text-rose-700">Released reservations</span>
          </div>
        </div>
      ) : (
        /* ADMIN METRICS */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Total Platform Food
            </span>
            <div className="text-2xl font-extrabold text-slate-900">{metrics.totalDonations ?? 0}</div>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block mb-1">
              Open Offers
            </span>
            <div className="text-2xl font-extrabold text-emerald-600">{metrics.openDonations ?? 0}</div>
          </div>
          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide block mb-1">
              Active Claims
            </span>
            <div className="text-2xl font-extrabold text-blue-600">{metrics.claimedDonations ?? 0}</div>
          </div>
          <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-2xs">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide block mb-1">
              Completed Pickups
            </span>
            <div className="text-2xl font-extrabold text-purple-600">{metrics.completedDonations ?? 0}</div>
          </div>
        </div>
      )}

      {/* Recent Offers Snippet */}
      {recentOffers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Live Surplus Available for Collection
            </h2>
            <button
              onClick={() => setView('browse')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Browse all feed &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOffers.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectDonation(item.id)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{item.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {item.donorOrganization?.name} • {item.donorOrganization?.locality}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {item.quantity} {item.unit}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {item.foodType}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
