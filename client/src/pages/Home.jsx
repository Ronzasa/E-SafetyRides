import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home">
      {!user && (
        <header className="home-topbar">
          <span className="navbar-brand">SafeRide<span>SA</span></span>
          <div className="home-topbar-actions">
            <Link to="/login" className="btn-secondary">Log in</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </div>
        </header>
      )}

      <section className="home-hero">
        <h1>Know who's really driving, before you get in.</h1>
        <p className="home-hero-sub">
          SafeRide SA lets you search any plate, verify the driver's identity, and see
          moderated safety reports from real passengers — across Uber, Bolt, and InDrive.
        </p>
        {!user && (
          <div className="home-hero-actions">
            <Link to="/register" className="btn-primary">Get started free</Link>
            <Link to="/login" className="btn-secondary">I already have an account</Link>
          </div>
        )}

        <div className="home-badges">
          <span className="badge badge-success">MATCH</span>
          <span className="badge badge-danger">MISMATCH</span>
          <span className="badge badge-warning">NO RECORD</span>
        </div>
      </section>

      <section className="home-steps">
        <h2 className="home-steps-title">How it works</h2>
        <div className="home-steps-grid">
          <div className="card home-step">
            <span className="home-step-num">1</span>
            <h3>Search a plate</h3>
            <p>Enter a number plate or driver name to pull up their safety profile.</p>
          </div>
          <div className="card home-step">
            <span className="home-step-num">2</span>
            <h3>Verify the driver</h3>
            <p>Scan a face to confirm you're getting in with the right person — MATCH, MISMATCH, or NO RECORD.</p>
          </div>
          <div className="card home-step">
            <span className="home-step-num">3</span>
            <h3>See safety signals</h3>
            <p>View moderated, corroborated reports — never unverified accusations.</p>
          </div>
          <div className="card home-step">
            <span className="home-step-num">4</span>
            <h3>Report an incident</h3>
            <p>Something felt off? Report it in seconds to help keep other passengers safe.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>SafeRide SA — an independent, cross-platform passenger safety project.</p>
      </footer>
    </div>
  );
}