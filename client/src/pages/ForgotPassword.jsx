import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthIcon({ name, size = 18 }) {
  const paths = {
    arrowLeft: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
    arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 6.2A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a18.6 18.6 0 0 1-3.2 3.8M6.2 6.2A18.7 18.7 0 0 0 2 12s3.5 6 10 6a10.6 10.6 0 0 0 3.8-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h2a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4" /></>,
  };

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function AuthVisual() {
  return (
    <aside className="auth-visual">
      <Link className="auth-brand" to="/">
        <span className="auth-brand-mark" aria-hidden="true"><span className="auth-brand-route" /><span className="auth-brand-core">S</span></span>
        <span>E-Safety<span>Rides</span></span>
      </Link>
      <div className="auth-visual-copy">
        <span className="auth-visual-overline"><span /> Passenger safety, reimagined</span>
        <h1>Make every ride<br /><em>feel different.</em></h1>
        <p>More context before you get in. More confidence once you do.</p>
        <div className="auth-route-art" aria-hidden="true">
          <div className="auth-route-grid" /><div className="auth-route-path auth-route-path-one" /><div className="auth-route-path auth-route-path-two" />
          <div className="auth-route-node auth-route-node-start"><AuthIcon name="pin" size={15} /></div><div className="auth-route-node auth-route-node-end">•</div>
          <div className="auth-route-label auth-route-label-start">Your route</div><div className="auth-route-label auth-route-label-end">Arrive with confidence</div>
          <div className="auth-route-compass"><AuthIcon name="route" size={16} /><span>N</span></div>
        </div>
      </div>
      <span className="auth-visual-note">A little more information can change the whole journey.</span>
    </aside>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email }, { auth: false });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <AuthVisual />
      <section className="auth-form-panel" aria-label="Forgot password">
        <Link className="auth-back-link" to="/login"><AuthIcon name="arrowLeft" size={15} /> Back to sign in</Link>
        <div className="auth-form-wrap">
          {sent ? (
            <div className="auth-success-state">
              <span className="auth-success-icon" aria-hidden="true">✓</span>
              <span className="auth-overline">Check your email</span>
              <h1>Reset link sent.</h1>
              <p>If that email is registered, a password reset link is on its way. The link expires in 1 hour &mdash; be sure to check your spam folder too.</p>
              <Link to="/login" className="auth-submit" style={{ textDecoration: 'none' }}>Back to sign in <AuthIcon name="arrowRight" size={16} /></Link>
            </div>
          ) : (
            <>
              <div className="auth-heading"><span className="auth-overline">Forgot password</span><h1>Let&apos;s get you<br />back <em>on track.</em></h1><p>Enter the email tied to your account and we&apos;ll send you a secure link to reset your password.</p></div>
              <form className="auth-form" onSubmit={handleSubmit}>
                {error && <div className="auth-form-error" role="alert">{error}</div>}
                <label htmlFor="email">Email address<input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus /></label>
                <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'} <AuthIcon name="arrowRight" size={16} /></button>
              </form>
              <p className="auth-switch">Remember your password? <Link to="/login">Sign in</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
