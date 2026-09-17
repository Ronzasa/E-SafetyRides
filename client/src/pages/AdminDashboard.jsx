import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function StatBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="stat-bar-row">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/trends')
      .then(setTrends)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page-container"><div className="auth-error">{error}</div></div>;
  if (!trends) return <div className="page-container"><p>Loading trends...</p></div>;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Safety trends</h1>
          <p className="page-subtitle">{trends.total} total report{trends.total === 1 ? '' : 's'}</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="card">
          <h2>By status</h2>
          {Object.entries(trends.byStatus).map(([status, count]) => (
            <StatBar key={status} label={status.replace('_', ' ')} count={count} total={trends.total} color="var(--color-primary)" />
          ))}
        </div>

        <div className="card">
          <h2>By platform</h2>
          {Object.entries(trends.byPlatform).map(([platform, count]) => (
            <StatBar key={platform} label={platform} count={count} total={trends.total} color="var(--color-accent)" />
          ))}
        </div>

        <div className="card">
          <h2>By severity</h2>
          {Object.entries(trends.bySeverity).map(([severity, count]) => (
            <StatBar
              key={severity}
              label={severity}
              count={count}
              total={trends.total}
              color={severity === 'high' ? 'var(--color-danger)' : severity === 'medium' ? 'var(--color-warning)' : 'var(--color-success)'}
            />
          ))}
        </div>

        <div className="card">
          <h2>By area</h2>
          {Object.entries(trends.byArea).map(([area, count]) => (
            <StatBar key={area} label={area} count={count} total={trends.total} color="var(--color-primary-dark)" />
          ))}
        </div>
      </div>
    </div>
  );
}