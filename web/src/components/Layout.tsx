import { LetterSwapNav } from '@/components/ui/m-random-letter-swap-1';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { AuthModal } from './AuthModal';
import { useApp } from '../state/AppState';
import { notifications } from '../data/mock';

const consumerNav = [
  { to: '/explore', label: 'Explore', icon: 'explore', end: false }, { to: '/search', label: 'Search', icon: 'search' },
  { to: '/contributions', label: 'My ideas', icon: 'layers' }, { to: '/earnings', label: 'Rewards', icon: 'wallet' }, { to: '/profile', label: 'Profile', icon: 'user' },
];
const merchantNav = [
  { to: '/m', label: 'Opportunities', icon: 'grid', end: true }, { to: '/m/selected', label: 'Selected', icon: 'layers' },
  { to: '/m/store', label: 'Store', icon: 'store' }, { to: '/profile', label: 'Profile', icon: 'user' },
];
export function Layout() {
  const { mode, toast } = useApp(); const loc = useLocation();
  const nav = mode === 'merchant' || loc.pathname.startsWith('/m') ? merchantNav : consumerNav;
  const unread = notifications.filter(n => n.unread).length;
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-in">
          <Link to={nav === merchantNav ? '/m' : '/'} className="brand">DropLab{nav === merchantNav && <span className="brand-mode">Merchant</span>}</Link>
          <LetterSwapNav className="topnav" links={nav} />
          <div className="topbar-actions">
            {nav === consumerNav && <Link to="/search" className="icon-btn desk-only" aria-label="Search"><Icon name="search" /></Link>}
            <Link to="/notifications" className="icon-btn bell" aria-label={`Notifications (${unread} unread)`}><Icon name="bell" />{unread > 0 && <span className="dot" />}</Link>
          </div>
        </div>
      </header>
      <main className="main"><Outlet /></main>
      <nav className="bottomnav" aria-label="Main (mobile)">
        {nav.map(n => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={22} /><span>{n.label}</span></NavLink>)}
      </nav>
      <AuthModal />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
