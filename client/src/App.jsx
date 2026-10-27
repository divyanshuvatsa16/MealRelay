import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import BrowseDonationsPage from './pages/BrowseDonationsPage';
import DonationDetailPage from './pages/DonationDetailPage';
import CreateDonationPage from './pages/CreateDonationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminConsolePage from './pages/AdminConsolePage';

function AppContent() {
  const [currentView, setCurrentView] = useState('browse');
  const [selectedDonationId, setSelectedDonationId] = useState(null);

  const handleSelectDonation = (id) => {
    setSelectedDonationId(id);
    setCurrentView('donation-detail');
  };

  const handleCreatedDonation = (newId) => {
    setSelectedDonationId(newId);
    setCurrentView('donation-detail');
  };

  return (
    <div className="relative min-h-screen flex flex-col text-slate-900 overflow-x-hidden">
      {/* Ambient Luminous Orbs for Frosted Glass Refraction */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-8%] left-[-4%] w-[48vw] h-[48vw] max-w-[650px] max-h-[650px] rounded-full bg-emerald-400/20 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[22%] right-[-8%] w-[42vw] h-[42vw] max-w-[600px] max-h-[600px] rounded-full bg-teal-400/20 blur-[130px] mix-blend-multiply" />
        <div className="absolute bottom-[-6%] left-[25%] w-[45vw] h-[45vw] max-w-[620px] max-h-[620px] rounded-full bg-sky-300/18 blur-[140px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Navbar currentView={currentView} setView={setCurrentView} />

        <main id="main-content" tabIndex={-1} className="flex-1">
          {currentView === 'browse' && (
            <BrowseDonationsPage
              key="browse"
              onSelectDonation={handleSelectDonation}
              isOwnerView={false}
              isClaimsView={false}
            />
          )}

          {currentView === 'my-donations' && (
            <BrowseDonationsPage
              key="my-donations"
              onSelectDonation={handleSelectDonation}
              isOwnerView={true}
              isClaimsView={false}
            />
          )}

          {currentView === 'my-claims' && (
            <BrowseDonationsPage
              key="my-claims"
              onSelectDonation={handleSelectDonation}
              isOwnerView={false}
              isClaimsView={true}
            />
          )}

          {currentView === 'donation-detail' && selectedDonationId && (
            <DonationDetailPage
              donationId={selectedDonationId}
              onBack={() => setCurrentView('browse')}
            />
          )}

          {currentView === 'create-donation' && (
            <CreateDonationPage
              onCreated={handleCreatedDonation}
              onCancel={() => setCurrentView('browse')}
            />
          )}

          {currentView === 'login' && (
            <LoginPage
              onLoginSuccess={() => setCurrentView('browse')}
              onGoToRegister={() => setCurrentView('register')}
            />
          )}

          {currentView === 'register' && (
            <RegisterPage
              onRegisterSuccess={() => setCurrentView('dashboard')}
              onGoToLogin={() => setCurrentView('login')}
            />
          )}

          {currentView === 'dashboard' && (
            <DashboardPage
              setView={setCurrentView}
              onSelectDonation={handleSelectDonation}
            />
          )}

          {currentView === 'admin' && (
            <AdminConsolePage onNavigateHome={() => setCurrentView('browse')} />
          )}
        </main>

        <footer className="glass-panel border-x-0 border-b-0 py-6 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-emerald-950">MealRelay</span>
              <span>•</span>
              <span>Making surplus food count.</span>
            </div>
            <div>
              Connecting surplus food with organizations that can distribute it.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
