import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function VerificationCard() {
  const [status, setStatus] = useState('scanning');

  useEffect(() => {
    const timer = setTimeout(() => setStatus('match'), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="verify-card">
      <p className="verify-card-label">Verifying driver</p>
      <div className="verify-card-plate">CA 402 981</div>
      <div className="verify-card-row"><span>Platform</span><span>Bolt</span></div>
      <div className="verify-card-row"><span>Area</span><span>Sea Point</span></div>
      <div className="verify-card-status">
        {status === 'scanning' ? (
          <span className="badge badge-neutral">Scanning face&hellip;</span>
        ) : (
          <span className="badge badge-success">MATCH</span>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const dashboardPath = user?.role === 'admin' ? '/admin/reports' : '/my-reports';

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
        <div className="home-hero-photo" role="img" aria-label="A city street at night, lit by car headlights" />
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <h1>Get in with confidence, every ride.</h1>
            <p className="home-hero-sub">
              SafeRide SA checks the plate and the person against what your driver-hailing
              app told you &mdash; then shows you what other passengers have actually experienced.
            </p>
            <div className="home-hero-actions">
              {user ? (
                <Link to={dashboardPath} className="btn-primary">Go to dashboard</Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary">Get started free</Link>
                  <Link to="/login" className="btn-secondary">I already have an account</Link>
                </>
              )}
            </div>
          </div>
          <VerificationCard />
        </div>
      </section>

      <div className="home-trust">
        Works across <strong>Uber</strong>, <strong>Bolt</strong>, and <strong>InDrive</strong> &mdash; one place to check any ride.
      </div>

      <section className="home-steps">
        <h2 className="home-steps-title">Four steps between you and a safer ride.</h2>
        <div className="home-timeline">
          <div className="home-timeline-step">
            <span className="home-timeline-dot">1</span>
            <h3>Search the plate</h3>
            <p>Enter a number plate or driver name before you get in.</p>
          </div>
          <div className="home-timeline-step">
            <span className="home-timeline-dot">2</span>
            <h3>Verify the driver</h3>
            <p>A quick face check confirms MATCH, MISMATCH, or NO RECORD.</p>
          </div>
          <div className="home-timeline-step">
            <span className="home-timeline-dot">3</span>
            <h3>Read the signals</h3>
            <p>Moderated, corroborated reports &mdash; never unverified accusations.</p>
          </div>
          <div className="home-timeline-step">
            <span className="home-timeline-dot">4</span>
            <h3>Report if needed</h3>
            <p>Something felt wrong? File it in under a minute.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        SafeRide SA &mdash; an independent, cross-platform passenger safety project.
      </footer>
    </div>
  );
}
