import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-success">Check your email</div>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
            If that email is registered, a password reset link has been sent to it. The link expires in 1 hour.
          </p>
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
        <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

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
