import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/driver-search', label: 'Search driver', icon: 'search' },
  { to: '/browse', label: 'Browse reports', icon: 'grid' },
  { to: '/report', label: 'Report incident', icon: 'report' },
  { to: '/my-reports', label: 'My reports', icon: 'file' },
  { to: '/verify-driver', label: 'Verify driver', icon: 'verify' },
];

function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'SR';
}

function AppIcon({ name, size = 17 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'search') {
    return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  }
  if (name === 'grid') {
    return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
  }
  if (name === 'report' || name === 'file') {
    return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>;
  }
  if (name === 'verify') {
    return <svg {...common}><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.8-3.5 3-5.25 6.5-5.25s5.7 1.75 6.5 5.25" /><path d="m17.5 14.5 1.4 1.4 2.6-2.9" /></svg>;
  }
  if (name === 'logout') {
    return <svg {...common}><path d="M10 5H5v14h5" /><path d="M14 8l4 4-4 4M18 12H9" /></svg>;
  }
  if (name === 'plus') {
    return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  }
  if (name === 'arrow') {
    return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
  }
  if (name === 'shield') {
    return <svg {...common}><path d="M12 3 19 6v5c0 4.5-2.9 7.8-7 10-4.1-2.2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>;
  }

  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

export function SafetyLogo() {
  return (
    <Link className="safety-logo" to="/" aria-label="E-SafetyRides home">
      <span className="safety-logo-mark"><AppIcon name="shield" size={17} /></span>
      <span>E-Safety<span>Rides</span></span>
    </Link>
  );
}

export function SafetyAppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <SafetyLogo />
        <div className="sidebar-label">Safety workspace</div>
        <nav className="app-nav" aria-label="Safety workspace navigation">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={location.pathname === link.to ? 'active' : ''}
            >
              <AppIcon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip">
            <span className="profile-avatar">{initials(user?.name)}</span>
            <span>
              <strong>{user?.name || 'Passenger'}</strong>
              <small>{user?.role === 'admin' ? 'Administrator' : 'Passenger account'}</small>
            </span>
          </div>
          <button type="button" className="signout" onClick={handleSignOut}>
            <AppIcon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="mobile-app-header">
          <SafetyLogo />
          <Link to="/" aria-label="Return home">Exit</Link>
        </header>
        {children}
      </main>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }) {
  return (
    <header className="app-page-intro">
      <div>
        <div className="app-eyebrow"><span />{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function StatusPill({ children, tone = 'green' }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function Metric({ value, label }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, to, action }) {
  return (
    <div className="empty-state-modern">
      <div className="empty-icon"><AppIcon name="file" size={20} /></div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="app-button primary" to={to}>{action}</Link>
    </div>
  );
}

export { AppIcon };
