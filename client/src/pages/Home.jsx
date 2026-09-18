import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const steps = [
  { icon: 'search', number: '01', title: 'Search the plate', body: 'Enter the vehicle plate or driver name before you get in.' },
  { icon: 'user', number: '02', title: 'Verify the driver', body: 'A quick face check confirms a match, mismatch, or no record.' },
  { icon: 'shield', number: '03', title: 'Read the signals', body: 'See moderated, corroborated reports from other passengers.' },
  { icon: 'file', number: '04', title: 'Report if needed', body: 'If something felt wrong, document it in under a minute.' },
];

function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardPath = user?.role === 'admin' ? '/admin/reports' : '/my-reports';
  const checkDriverPath = user ? '/driver-search' : '/register';
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link className="landing-brand" to="/" onClick={closeMenu}>
          <span className="landing-brand-mark" aria-hidden="true"><span className="landing-brand-route" /><span className="landing-brand-core">S</span></span>
          <span>E-Safety<span className="landing-brand-accent">Rides</span></span>
        </Link>
        <button className="landing-menu-toggle" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={21} />
        </button>
        <div className={`landing-nav-links ${menuOpen ? 'landing-nav-links-open' : ''}`}>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#why" onClick={closeMenu}>Why E-SafetyRides</a>
          <a href="#faq" onClick={closeMenu}>FAQ</a>
          <div className="landing-nav-actions">
            {user ? (
              <Link className="landing-login-link" to={dashboardPath} onClick={closeMenu}>Dashboard</Link>
            ) : (
              <Link className="landing-login-link" to="/login" onClick={closeMenu}>Log in</Link>
            )}
            <Link className="landing-button landing-button-small" to={user ? checkDriverPath : '/register'} onClick={closeMenu}>
              {user ? 'Check a driver' : 'Get started'} <Icon name="arrow" size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span className="landing-eyebrow-dot" /> Passenger safety, reimagined</div>
          <h1>Get in with <em>confidence.</em><br />Every ride.</h1>
          <p className="landing-hero-lede">Know who is behind the wheel before you get in. E-SafetyRides helps passengers check driver details, understand safety signals, and make informed decisions.</p>
          <div className="landing-hero-actions">
            <Link className="landing-button landing-button-primary" to={checkDriverPath}>Check a driver <Icon name="arrow" size={17} /></Link>
            <a className="landing-text-link" href="#how-it-works">See how it works <span>↓</span></a>
          </div>
          <div className="landing-hero-proof"><div className="landing-proof-avatars"><span>AM</span><span>TK</span><span>JN</span></div><span>Built for every passenger, on every platform.</span></div>
        </div>

        <div className="landing-hero-visual" aria-label="Driver verification preview">
          <div className="landing-visual-glow" />
          <div className="landing-grid-lines" />
          <div className="landing-verification-card">
            <div className="landing-card-topline"><span><span className="landing-live-dot" /> Live verification</span><span className="landing-card-time">Just now</span></div>
            <div className="landing-driver-row"><div className="landing-driver-avatar">JD</div><div><p className="landing-driver-name">John Dlamini</p><p className="landing-driver-meta">Bolt driver · Cape Town</p></div><span className="landing-verified-pill"><Icon name="check" size={13} /> Verified</span></div>
            <div className="landing-plate-box"><span>Vehicle plate</span><strong>CA 402 981</strong><span className="landing-match-label">MATCH</span></div>
            <div className="landing-signal-list">
              <div><span className="landing-signal-icon landing-green"><Icon name="check" size={13} /></span><span>Identity matches booking</span><b>Clear</b></div>
              <div><span className="landing-signal-icon landing-green"><Icon name="check" size={13} /></span><span>Community safety record</span><b>Clear</b></div>
              <div><span className="landing-signal-icon landing-amber"><span /></span><span>Recent passenger reports</span><b className="landing-amber-text">Review</b></div>
            </div>
            <div className="landing-card-foot"><span>Information is moderated and privacy-conscious.</span><Icon name="arrow" size={15} /></div>
          </div>
          <div className="landing-floating-tag landing-tag-one"><span className="landing-tag-icon"><Icon name="shield" size={15} /></span><span><strong>Safety first</strong><small>Make informed choices</small></span></div>
          <div className="landing-floating-tag landing-tag-two"><span className="landing-tag-number">4.9</span><span><strong>Community trust</strong><small>Passenger-rated signals</small></span></div>
        </div>
      </section>

      <section className="landing-platform-strip"><p>One place to check any ride</p><div><span>uber</span><span className="landing-bolt-word">bolt</span><span>inDrive</span><span className="landing-platform-more">and more</span></div></section>

      <section className="landing-pulse-section" aria-label="Community safety pulse">
        <div className="landing-pulse-intro"><span className="landing-pulse-kicker"><span className="landing-pulse-live" /> Community pulse</span><strong>Safety signals,<br /><em>always moving.</em></strong></div>
        <div className="landing-pulse-stats"><div><span className="landing-pulse-number">12.8k</span><span>rides checked this month</span></div><div><span className="landing-pulse-number">94%</span><span>passengers feel more informed</span></div><div><span className="landing-pulse-number">24/7</span><span>moderation in motion</span></div></div>
        <div className="landing-pulse-orbit" aria-hidden="true"><span className="landing-orbit-dot landing-orbit-dot-a" /><span className="landing-orbit-dot landing-orbit-dot-b" /><span className="landing-orbit-dot landing-orbit-dot-c" /><span className="landing-orbit-core"><Icon name="shield" size={22} /></span></div>
      </section>

      <section className="landing-steps-section" id="how-it-works">
        <div className="landing-section-heading"><div><div className="landing-eyebrow"><span className="landing-eyebrow-dot" /> Simple by design</div><h2>Four steps between<br /><em>you</em> and a safer ride.</h2></div><p>Safety should feel simple. We give you the context you need, right when you need it.</p></div>
        <div className="landing-steps-grid">{steps.map((step) => (
          <article className="landing-step-card" key={step.number}>
            <div className="landing-step-top"><span className="landing-step-icon"><Icon name={step.icon} size={19} /></span><span>{step.number}</span></div>
            <h3>{step.title}</h3><p>{step.body}</p><Link to={checkDriverPath} aria-label={`Learn more about ${step.title}`}><Icon name="arrow" size={17} /></Link>
          </article>
        ))}</div>
      </section>

      <section className="landing-why-section" id="why"><div className="landing-why-panel"><div><div className="landing-eyebrow landing-light"><span className="landing-eyebrow-dot" /> A better way forward</div><h2>Trust the ride.<br /><em>Keep your power.</em></h2></div><p>E-SafetyRides is an independent safety layer for the journeys you already take. No panic. No guesswork. Just clearer information before you make a decision.</p><Link className="landing-button landing-button-light" to={checkDriverPath}>Start checking <Icon name="arrow" size={16} /></Link></div></section>

      <footer className="landing-footer"><Link className="landing-brand" to="/"><span className="landing-brand-mark" aria-hidden="true"><span className="landing-brand-route" /><span className="landing-brand-core">S</span></span><span>E-Safety<span className="landing-brand-accent">Rides</span></span></Link><span>© 2026 E-SafetyRides. Built for safer journeys.</span><div><a href="#privacy">Privacy</a><a href="#contact">Contact</a></div></footer>
    </main>
  );
}
