import React, { useState } from 'react';
import { api } from '../api/client';

const ALLOWED_UNITS = ['portions', 'meals', 'kg', 'boxes', 'servings', 'packets'];
const FOOD_TYPES = [
  { value: 'VEGETARIAN', label: '🌱 Vegetarian' },
  { value: 'NON_VEGETARIAN', label: '🍗 Non-Vegetarian' },
  { value: 'OTHER', label: '📦 Packaged / Other' }
];

export default function EditDonationModal({ donation, onClose, onUpdated }) {
  // Format datetime-local strings
  const toLocalISO = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: donation.title,
    description: donation.description,
    quantity: donation.quantity,
    unit: donation.unit,
    foodType: donation.foodType,
    preparedAt: toLocalISO(donation.preparedAt),
    pickupDeadline: toLocalISO(donation.pickupDeadline),
    consumeBy: toLocalISO(donation.consumeBy)
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-flight validation
    const prep = new Date(formData.preparedAt).getTime();
    const pickup = new Date(formData.pickupDeadline).getTime();
    const consume = new Date(formData.consumeBy).getTime();

    if (consume <= prep) {
      setError('Consume-by deadline must be later than preparation time');
      return;
    }
    if (pickup > consume) {
      setError('Pickup deadline cannot be later than consume-by time');
      return;
    }
    if (pickup < prep) {
      setError('Pickup deadline cannot be earlier than preparation time');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        foodType: formData.foodType,
        preparedAt: new Date(formData.preparedAt).toISOString(),
        pickupDeadline: new Date(formData.pickupDeadline).toISOString(),
        consumeBy: new Date(formData.consumeBy).toISOString()
      };

      const res = await api.updateDonation(donation.id, payload);
      if (res.success) {
        onUpdated(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to update donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Edit Surplus Offer</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Offer Title</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Handling Details</label>
            <textarea
              required
              rows={3}
              minLength={5}
              maxLength={1000}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {ALLOWED_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Food Category</label>
              <select
                value={formData.foodType}
                onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prepared At</label>
              <input
                type="datetime-local"
                required
                value={formData.preparedAt}
                onChange={(e) => setFormData({ ...formData, preparedAt: e.target.value })}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Deadline</label>
              <input
                type="datetime-local"
                required
                value={formData.pickupDeadline}
                onChange={(e) => setFormData({ ...formData, pickupDeadline: e.target.value })}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Consume By</label>
              <input
                type="datetime-local"
                required
                value={formData.consumeBy}
                onChange={(e) => setFormData({ ...formData, consumeBy: e.target.value })}
                className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
