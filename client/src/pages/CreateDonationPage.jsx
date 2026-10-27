import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ALLOWED_UNITS = ['portions', 'meals', 'kg', 'boxes', 'servings', 'packets'];
const FOOD_TYPES = [
  { value: 'VEGETARIAN', label: '🌱 Vegetarian' },
  { value: 'NON_VEGETARIAN', label: '🍗 Non-Vegetarian' },
  { value: 'OTHER', label: '📦 Packaged / Other' }
];

export default function CreateDonationPage({ onCreated, onCancel }) {
  const { user, organization, isAuthenticated, isDonor, isApproved } = useAuth();

  // Helper for datetime-local strings
  const getInitialDates = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    const prep = new Date(now.getTime() - 3600000 - offset).toISOString().slice(0, 16);
    const pickup = new Date(now.getTime() + 4 * 3600000 - offset).toISOString().slice(0, 16);
    const consume = new Date(now.getTime() + 12 * 3600000 - offset).toISOString().slice(0, 16);

    return { prep, pickup, consume };
  };

  const initialDates = getInitialDates();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    unit: 'portions',
    foodType: 'VEGETARIAN',
    preparedAt: initialDates.prep,
    pickupDeadline: initialDates.pickup,
    consumeBy: initialDates.consume
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-xs text-slate-600 mb-6">
            You must be signed in with an approved Food Donor organization account to publish surplus offers.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
          >
            Go to Browse Feed
          </button>
        </div>
      </div>
    );
  }

  if (!isDonor) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Donor Account Required</h2>
          <p className="text-xs text-slate-600 mb-6">
            Your current account role is <span className="font-semibold">{user.role}</span>. Only organizations registered as Food Donors may publish surplus food.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            Return to Browse Feed
          </button>
        </div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            ⏳
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Organization Approval Pending</h2>
          <p className="text-xs text-slate-600 mb-6">
            Your organization <span className="font-semibold">{organization?.name}</span> is currently{' '}
            <span className="font-bold text-amber-700">{organization?.approvalStatus}</span>. For community safety, administrators verify all donors before donations can be published.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            Return to Browse Feed
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const prep = new Date(formData.preparedAt).getTime();
    const pickup = new Date(formData.pickupDeadline).getTime();
    const consume = new Date(formData.consumeBy).getTime();
    const now = Date.now();

    if (pickup <= now) {
      setError('Pickup deadline must be in the future.');
      return;
    }

    if (consume <= prep) {
      setError('Consume-by deadline must be later than preparation time.');
      return;
    }

    if (pickup > consume) {
      setError('Pickup deadline cannot be later than the consume-by deadline.');
      return;
    }

    if (pickup < prep) {
      setError('Pickup deadline cannot be earlier than preparation time.');
      return;
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        quantity: qty,
        unit: formData.unit,
        foodType: formData.foodType,
        preparedAt: new Date(formData.preparedAt).toISOString(),
        pickupDeadline: new Date(formData.pickupDeadline).toISOString(),
        consumeBy: new Date(formData.consumeBy).toISOString()
      };

      const res = await api.createDonation(payload);
      if (res.success && res.data) {
        onCreated(res.data.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to publish surplus donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Publish Surplus Food Offer
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Registered as <span className="font-semibold text-slate-800">{organization?.name}</span> ({organization?.locality}).
          </p>
        </div>

        {error && (
          <div className="mx-6 sm:mx-8 mt-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <span className="font-bold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Offer Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. Freshly Baked Mixed Bagels & Pastries"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Description & Packaging Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              minLength={5}
              maxLength={1000}
              placeholder="Provide food handling instructions, dietary notes, packaging details, and pickup point."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Quantity, Unit, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                placeholder="e.g. 25"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {ALLOWED_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Food Category
              </label>
              <select
                value={formData.foodType}
                onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Prepared At
              </label>
              <input
                type="datetime-local"
                required
                value={formData.preparedAt}
                onChange={(e) => setFormData({ ...formData, preparedAt: e.target.value })}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1.5">
                Pickup Deadline
              </label>
              <input
                type="datetime-local"
                required
                value={formData.pickupDeadline}
                onChange={(e) => setFormData({ ...formData, pickupDeadline: e.target.value })}
                className="w-full text-xs px-2.5 py-2 bg-amber-50/50 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Consume By
              </label>
              <input
                type="datetime-local"
                required
                value={formData.consumeBy}
                onChange={(e) => setFormData({ ...formData, consumeBy: e.target.value })}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing Offer...' : 'Publish Surplus Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
