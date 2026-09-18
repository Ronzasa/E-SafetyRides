import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import GoBackButton from '../components/GoBackButton';

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

function OverviewCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, fontFamily: 'var(--font-heading)' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', textTransform: 'capitalize' }}>{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [trends, setTrends] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/trends'),
      api.get('/admin/overview'),
    ])
      .then(([trendsData, overviewData]) => {
        setTrends(trendsData);
        setOverview(overviewData);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page-container"><div className="auth-error">{error}</div></div>;
  if (!trends || !overview) return <div className="page-container"><p>Loading dashboard...</p></div>;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Admin dashboard</h1>
          <p className="page-subtitle">{trends.total} total report{trends.total === 1 ? '' : 's'} · {overview.totalUsers} user{overview.totalUsers === 1 ? '' : 's'}</p>
        </div>
        <GoBackButton />
      </header>

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <OverviewCard label="Total users" value={overview.totalUsers} color="var(--color-primary)" />
        <OverviewCard label="Total reports" value={overview.totalIncidents} color="var(--color-accent)" />
        <OverviewCard label="Pending review" value={overview.pendingCount} color="var(--color-warning)" />
        <OverviewCard label="Confirmed" value={overview.confirmedCount} color="var(--color-success)" />
      </div>

      <h2>Safety trends</h2>

      <div className="dashboard-grid">
        <div className="card">
          <h3>By status</h3>
          {Object.entries(trends.byStatus).map(([status, count]) => (
            <StatBar key={status} label={status.replace('_', ' ')} count={count} total={trends.total} color="var(--color-primary)" />
          ))}
        </div>

        <div className="card">
          <h3>By platform</h3>
          {Object.entries(trends.byPlatform).map(([platform, count]) => (
            <StatBar key={platform} label={platform} count={count} total={trends.total} color="var(--color-accent)" />
          ))}
        </div>

        <div className="card">
          <h3>By severity</h3>
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
          <h3>By area</h3>
          {Object.entries(trends.byArea).map(([area, count]) => (
            <StatBar key={area} label={area} count={count} total={trends.total} color="var(--color-primary-dark)" />
          ))}
        </div>
      </div>
    </div>
  );
}
