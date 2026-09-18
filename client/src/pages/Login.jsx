import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message || '';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.role === 'admin' ? '/admin/reports' : '/my-reports');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <AuthVisual />
      <section className="auth-form-panel" aria-label="Sign in">
        <Link className="auth-back-link" to="/"><AuthIcon name="arrowLeft" size={15} /> Back to home</Link>
        <div className="auth-form-wrap">
          <div className="auth-heading"><span className="auth-overline">Welcome back</span><h1>Good to see you again.</h1><p>Sign in to check a ride, manage reports, and keep your voice heard.</p></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {message && <div className="auth-form-success" role="status">{message}</div>}
            {error && <div className="auth-form-error" role="alert">{error}</div>}
            <label htmlFor="email">Email address<input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus /></label>
            <label htmlFor="password">Password<div className="auth-password-field"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}><AuthIcon name={showPassword ? 'eyeOff' : 'eye'} size={17} /></button></div></label>
            <div className="auth-form-meta"><label className="auth-checkbox-label"><input type="checkbox" name="remember" /><span>Remember me</span></label><Link to="/forgot-password">Forgot password?</Link></div>
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} <AuthIcon name="arrowRight" size={16} /></button>
          </form>
          <p className="auth-switch">New to E-SafetyRides? <Link to="/register">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
