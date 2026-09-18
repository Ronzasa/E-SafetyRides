import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminAppShell, AppIcon, PageIntro, StatusPill } from '../components/SafetyAppShell';
import { api } from '../lib/api';

const STATUS_ORDER = ['pending', 'confirmed', 'under_review', 'rejected'];

const STATUS_META = {
  pending: { label: 'Pending review', tone: 'amber' },
  confirmed: { label: 'Confirmed reports', tone: 'green' },
  under_review: { label: 'Under review', tone: 'blue' },
  rejected: { label: 'Rejected', tone: 'red' },
};

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-ZA');
}

function statusMeta(status) {
  return STATUS_META[status] || {
    label: String(status || 'Uncategorised').replace(/_/g, ' '),
    tone: 'green',
  };
}

function AdminMetricCard({ label, value, note, tone = 'green' }) {
  return (
    <article className={`admin-metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{formatCount(value)}</strong>
      <small>{note}</small>
    </article>
  );
}

function StatusBar({ status, count, total }) {
  const meta = statusMeta(status);
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="admin-status-bar">
      <div className="admin-status-bar-label">
        <span>{meta.label}</span>
        <strong>{formatCount(count)}</strong>
      </div>
      <div className="admin-status-track">
        <span className={meta.tone} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
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

  const statuses = useMemo(() => {
    if (!trends?.byStatus) return [];
    const known = STATUS_ORDER.filter((status) => Object.hasOwn(trends.byStatus, status));
    const remaining = Object.keys(trends.byStatus).filter((status) => !STATUS_ORDER.includes(status));
    return [...known, ...remaining];
  }, [trends]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Administrator';

  return (
    <AdminAppShell>
      <div className="app-content admin-content">
        <PageIntro
          eyebrow="Operations overview"
          title={`Good morning, ${firstName}.`}
          description="Monitor live safety signals, moderation workload, and community access from one place."
          action={(
            <Link className="app-button ghost admin-header-action" to="/admin/reports">
              <AppIcon name="review" size={16} /> Open review queue
            </Link>
          )}
        />

        {error && <div className="auth-error">{error}</div>}
        {!error && (!trends || !overview) && <p className="workflow-loading">Loading dashboard...</p>}

        {!error && trends && overview && (
          <>
            <section className="admin-metrics-grid" aria-label="Operations metrics">
              <AdminMetricCard
                label="Total reports"
                value={overview.totalIncidents}
                note={`${formatCount(trends.total)} safety signal${trends.total === 1 ? '' : 's'} in the system`}
              />
              <AdminMetricCard
                label="Need attention"
                value={overview.pendingCount}
                note="Pending moderation"
                tone="amber"
              />
              <AdminMetricCard
                label="Registered users"
                value={overview.totalUsers}
                note="Community accounts"
                tone="blue"
              />
              <AdminMetricCard
                label="Confirmed signals"
                value={overview.confirmedCount}
                note="Published after review"
                tone="green"
              />
            </section>

            <section className="admin-dashboard-grid">
              <article className="app-card admin-chart-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="section-kicker">Safety signals</span>
                    <h2>Reports by status</h2>
                  </div>
                  <span className="admin-total-label">{formatCount(trends.total)} total</span>
                </div>

                {statuses.length > 0 ? (
                  <div className="admin-status-bars">
                    {statuses.map((status) => (
                      <StatusBar
                        key={status}
                        status={status}
                        count={trends.byStatus[status]}
                        total={trends.total}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="admin-empty-copy">No report status data is available yet.</p>
                )}
              </article>

              <article className="app-card admin-activity-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="section-kicker">Live activity</span>
                    <h2>Moderation snapshot</h2>
                  </div>
                  <Link to="/admin/reports">View queue <AppIcon name="arrow" size={14} /></Link>
                </div>

                <div className="admin-activity-list">
                  <div>
                    <span className="admin-activity-icon amber"><AppIcon name="clock" size={16} /></span>
                    <p><strong>{formatCount(overview.pendingCount)} report{overview.pendingCount === 1 ? '' : 's'} awaiting review</strong><small>Prioritise the moderation queue.</small></p>
                    <StatusPill tone="amber">Pending</StatusPill>
                  </div>
                  <div>
                    <span className="admin-activity-icon green"><AppIcon name="check" size={16} /></span>
                    <p><strong>{formatCount(overview.confirmedCount)} confirmed safety signal{overview.confirmedCount === 1 ? '' : 's'}</strong><small>Published to help passengers make informed choices.</small></p>
                    <StatusPill tone="green">Published</StatusPill>
                  </div>
                  <div>
                    <span className="admin-activity-icon blue"><AppIcon name="users" size={16} /></span>
                    <p><strong>{formatCount(overview.totalUsers)} registered user{overview.totalUsers === 1 ? '' : 's'}</strong><small>Community accounts with access to safety tools.</small></p>
                    <StatusPill tone="blue">Community</StatusPill>
                  </div>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </AdminAppShell>
  );
}
