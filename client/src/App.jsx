import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BrowseDonationsPage from './pages/BrowseDonationsPage';
import DonationDetailPage from './pages/DonationDetailPage';
import CreateDonationPage from './pages/CreateDonationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminConsolePage from './pages/AdminConsolePage';

function AppContent() {
  const { isAuthenticated } = useAuth();
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar currentView={currentView} setView={setCurrentView} />

      <main className="flex-1">
        {currentView === 'browse' && (
          <BrowseDonationsPage
            onSelectDonation={handleSelectDonation}
            isOwnerView={false}
            isClaimsView={false}
          />
        )}

        {currentView === 'my-donations' && (
          <BrowseDonationsPage
            onSelectDonation={handleSelectDonation}
            isOwnerView={true}
            isClaimsView={false}
          />
        )}

        {currentView === 'my-claims' && (
          <BrowseDonationsPage
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

      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">MealRelay</span>
            <span>•</span>
            <span>Making surplus food count.</span>
          </div>
          <div>
            Connecting surplus food with organizations that can distribute it.
          </div>
        </div>
      </footer>
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
