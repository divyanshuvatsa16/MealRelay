import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentView, setView }) {
  const { user, organization, isAuthenticated, isDonor, isNgo, isApproved, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('browse')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Meal<span className="text-emerald-600">Relay</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setView('browse')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'browse'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Browse Food
            </button>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Dashboard
                </button>

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => setView('admin')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentView === 'admin'
                        ? 'bg-purple-100 text-purple-800 font-bold'
                        : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                    }`}
                  >
                    Admin Console
                  </button>
                )}

                {isDonor && (
                  <button
                    onClick={() => setView('my-donations')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentView === 'my-donations'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Postings
                  </button>
                )}

                {isNgo && (
                  <button
                    onClick={() => setView('my-claims')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentView === 'my-claims'
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Reservations
                  </button>
                )}

                {isDonor && isApproved && (
                  <button
                    onClick={() => setView('create-donation')}
                    className="ml-2 inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all shadow-emerald-600/20"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Post Surplus
                  </button>
                )}
              </>
            )}
          </nav>

          {/* User Status / Auth Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                  <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                      {organization?.name || user.role}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {organization?.approvalStatus || 'USER'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('login')}
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setView('register')}
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all shadow-emerald-600/20"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
