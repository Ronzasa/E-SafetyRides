import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (data.resetLink) setResetLink(data.resetLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-success">Reset link generated!</div>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
            If that email is registered, a password reset link has been generated.
          </p>
          {resetLink && (
            <div style={{ marginTop: '1rem', textAlign: 'left' }}>
              <p className="form-hint" style={{ marginBottom: '0.5rem' }}>
                Demo mode — in production this link would be sent via email:
              </p>
              <Link to={resetLink.replace(/^.*\/\/[^/]+/, '')} style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
                {resetLink}
              </Link>
            </div>
          )}
          <Link to="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', textDecoration: 'none' }}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Forgot password</h1>
        <p className="auth-subtitle">Enter your email and we'll generate a reset link</p>

        {error && <div className="auth-error">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
