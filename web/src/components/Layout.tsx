import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { AuthModal } from './AuthModal';
import { useApp } from '../state/AppState';
import { notifications } from '../data/mock';

const consumerNav = [
  { to: '/', label: 'Explorar', icon: 'explore', end: true }, { to: '/buscar', label: 'Buscar', icon: 'search' },
  { to: '/aportes', label: 'Aportes', icon: 'layers' }, { to: '/ganancias', label: 'Ganancias', icon: 'wallet' }, { to: '/perfil', label: 'Perfil', icon: 'user' },
];
const merchantNav = [
  { to: '/m', label: 'Oportunidades', icon: 'grid', end: true }, { to: '/m/seleccionados', label: 'Seleccionados', icon: 'layers' },
  { to: '/m/tienda', label: 'Tienda', icon: 'store' }, { to: '/perfil', label: 'Perfil', icon: 'user' },
];
export function Layout() {
  const { mode, toast } = useApp(); const loc = useLocation();
  const nav = mode === 'merchant' || loc.pathname.startsWith('/m') ? merchantNav : consumerNav;
  const unread = notifications.filter(n => n.unread).length;
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-in">
          <Link to={nav === merchantNav ? '/m' : '/'} className="brand">DropLab{nav === merchantNav && <span className="brand-mode">Comerciante</span>}</Link>
          <nav className="topnav" aria-label="Principal">{nav.map(n => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}</nav>
          <div className="topbar-actions">
            {nav === consumerNav && <Link to="/buscar" className="icon-btn desk-only" aria-label="Buscar"><Icon name="search" /></Link>}
            <Link to="/notificaciones" className="icon-btn bell" aria-label={`Notificaciones (${unread} sin leer)`}><Icon name="bell" />{unread > 0 && <span className="dot" />}</Link>
          </div>
        </div>
      </header>
      <main className="main"><Outlet /></main>
      <nav className="bottomnav" aria-label="Principal móvil">
        {nav.map(n => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={22} /><span>{n.label}</span></NavLink>)}
      </nav>
      <AuthModal />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
