import { useState } from 'react';
import { Leaf, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentView, setView }) {
  const { user, isAuthenticated, isDonor, isNgo, isApproved, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = view => { setView(view); setOpen(false); };
  const links = [['browse', 'Find food']];
  if (isAuthenticated) links.push(['dashboard', 'Dashboard']);
  if (isDonor) links.push(['my-donations', 'My donations']);
  if (isNgo) links.push(['my-claims', 'My pickups']);
  if (user?.role === 'ADMIN') links.push(['admin', 'Admin console']);
  const navigation = <>
    {links.map(([view, label]) => <button key={view} className={`nav-link ${currentView === view ? 'nav-link-active' : ''}`} aria-current={currentView === view ? 'page' : undefined} onClick={() => navigate(view)}>{label}</button>)}
    {isDonor && isApproved && <button className="button-primary" onClick={() => navigate('create-donation')}>Post surplus</button>}
    {isAuthenticated ? <button className="nav-link" onClick={() => { logout(); navigate('browse'); }}>Sign out</button> : <><button className="nav-link" onClick={() => navigate('login')}>Sign in</button><button className="button-primary" onClick={() => navigate('register')}>Join MealRelay</button></>}
  </>;
  return <header className="site-header" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between min-h-20 gap-4">
        <button className="brand" onClick={() => navigate('browse')} aria-label="MealRelay home"><span className="brand-mark"><Leaf size={24} aria-hidden="true" /></span>MealRelay</button>
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1">{navigation}</nav>
        <button className="nav-link lg:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="lg:hidden flex flex-col items-stretch gap-2 pb-5">{navigation}</nav>}
    </div>
  </header>;
}
