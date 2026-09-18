import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide navbar entirely on auth pages
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  if (!user || authRoutes.includes(location.pathname)) return null;

  const isActive = (path) => location.pathname === path;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <Link
        to={user.role === "admin" ? "/admin/reports" : "/my-reports"}
        className="navbar-brand"
        onClick={closeMenu}
      >
        E-Safety<span>Rides</span>
      </Link>

      {/* Hamburger toggle — mobile only */}
      <button
        className={`navbar-hamburger ${menuOpen ? 'navbar-hamburger-open' : ''}`}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
      >
        <span /><span /><span />
      </button>

      {/* Mobile overlay */}
      {menuOpen && <div className="navbar-mobile-overlay" onClick={closeMenu} />}

      <div className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}>
        {user.role !== "admin" && (
          <>
            <Link to="/report" className={isActive("/report") ? "navbar-link-active" : ""} onClick={closeMenu}>Report</Link>
            <Link to="/my-reports" className={isActive("/my-reports") ? "navbar-link-active" : ""} onClick={closeMenu}>My reports</Link>
            <Link to="/browse" className={isActive("/browse") ? "navbar-link-active" : ""} onClick={closeMenu}>Browse</Link>
            <Link to="/driver-search" className={isActive("/driver-search") ? "navbar-link-active" : ""} onClick={closeMenu}>Driver Search</Link>
          </>
        )}

        {user.role === "admin" && (
          <>
            <Link to="/admin/reports" className={isActive("/admin/reports") ? "navbar-link-active" : ""} onClick={closeMenu}>Review queue</Link>
            <Link to="/admin/trends" className={isActive("/admin/trends") ? "navbar-link-active" : ""} onClick={closeMenu}>Dashboard</Link>
            <Link to="/admin/users" className={isActive("/admin/users") ? "navbar-link-active" : ""} onClick={closeMenu}>Users</Link>
          </>
        )}

        {/* Mobile-only user info + logout */}
        <div className="navbar-mobile-footer">
          <span className="navbar-username">{user.name}</span>
          <button className="btn-secondary btn-sm" onClick={() => { closeMenu(); logout(); }}>Log out</button>
        </div>
      </div>

      {/* Desktop-only user section */}
      <div className="navbar-user">
        <span className="navbar-username">{user.name}</span>
        <button className="btn-secondary btn-sm" onClick={logout}>Log out</button>
      </div>
    </nav>
  );
}
