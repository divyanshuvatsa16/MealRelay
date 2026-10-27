import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onLoginSuccess, onGoToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email: demoEmail, password: demoPass });
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to MealRelay
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your food donor or NGO coordination dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. donor@demo.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Quick-Fill Buttons */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            Development Demo Accounts (1-Click Login)
          </span>

          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleDemoLogin('donor@demo.org', 'DemoPass123!')}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-800">Approved Donor</div>
              <div className="text-[10px] text-slate-500 truncate">Green Bites Cafe</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('ngo@demo.org', 'DemoPass123!')}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-800">Approved NGO</div>
              <div className="text-[10px] text-slate-500 truncate">Community Harvest</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('pending.ngo@demo.org', 'DemoPass123!')}
              className="p-2.5 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-800">Pending NGO</div>
              <div className="text-[10px] text-slate-500 truncate">Hope Shelter</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('admin@demo.org', 'DemoPass123!')}
              className="p-2.5 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-slate-800">Administrator</div>
              <div className="text-[10px] text-slate-500 truncate">System Hub</div>
            </button>
          </div>
        </div>

        {/* Link to Register */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Need to register a new organization?{' '}
          <button
            onClick={onGoToRegister}
            className="font-semibold text-emerald-600 hover:text-emerald-700 underline"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
