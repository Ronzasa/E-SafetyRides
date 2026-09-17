import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to={user.role === 'admin' ? '/admin/reports' : '/my-reports'} className="navbar-brand">
        SafeRide<span>SA</span>
      </Link>

      <div className="navbar-links">
        {user.role !== 'admin' && (
          <Link to="/my-reports" className={isActive('/my-reports') ? 'navbar-link-active' : ''}>
            My reports
          </Link>
        )}

        {user.role === 'admin' && (
          <>
            <Link to="/admin/reports" className={isActive('/admin/reports') ? 'navbar-link-active' : ''}>
              Review queue
            </Link>
            <Link to="/admin/trends" className={isActive('/admin/trends') ? 'navbar-link-active' : ''}>
              Trends
            </Link>
          </>
        )}
      </div>

      <div className="navbar-user">
        <span className="navbar-username">{user.name}</span>
        <button className="btn-secondary btn-sm" onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}