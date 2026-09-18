import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

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

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(newPassword)) {
      setError('Password must be at least 6 characters with letters and numbers');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <AuthVisual />
      <section className="auth-form-panel" aria-label="Reset password">
        <Link className="auth-back-link" to="/login"><AuthIcon name="arrowLeft" size={15} /> Back to sign in</Link>
        <div className="auth-form-wrap">
          {!token ? (
            <div className="auth-success-state">
              <span className="auth-overline">Link expired or invalid</span>
              <h1>We can&apos;t reset<br />that <em>right now.</em></h1>
              <p>No reset token was found. Please request a fresh link from the forgot-password page and try again.</p>
              <Link to="/forgot-password" className="auth-submit" style={{ textDecoration: 'none' }}>Request a new link <AuthIcon name="arrowRight" size={16} /></Link>
            </div>
          ) : done ? (
            <div className="auth-success-state">
              <span className="auth-success-icon" aria-hidden="true">✓</span>
              <span className="auth-overline">All done</span>
              <h1>Password updated.</h1>
              <p>Your password has been reset successfully. You can now sign in with your new credentials.</p>
              <button type="button" className="auth-submit" onClick={() => navigate('/login', { state: { message: 'Password reset! Log in with your new password.' } })}>Go to sign in <AuthIcon name="arrowRight" size={16} /></button>
            </div>
          ) : (
            <>
              <div className="auth-heading"><span className="auth-overline">Reset password</span><h1>Choose a new<br /><em>password.</em></h1><p>Pick a strong password you haven&apos;t used before to keep your account secure.</p></div>
              <form className="auth-form" onSubmit={handleSubmit}>
                {error && <div className="auth-form-error" role="alert">{error}</div>}
                <label htmlFor="newPassword">New password<div className="auth-password-field"><input id="newPassword" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} autoComplete="new-password" required autoFocus /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}><AuthIcon name={showPassword ? 'eyeOff' : 'eye'} size={17} /></button></div></label>
                <label htmlFor="confirmPassword">Confirm new password<div className="auth-password-field"><input id="confirmPassword" type={showConfirmation ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" minLength={6} autoComplete="new-password" required /><button type="button" aria-label={showConfirmation ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmation((visible) => !visible)}><AuthIcon name={showConfirmation ? 'eyeOff' : 'eye'} size={17} /></button></div></label>
                <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset password'} <AuthIcon name="arrowRight" size={16} /></button>
              </form>
              <p className="auth-switch">Remember your password? <Link to="/login">Sign in</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
