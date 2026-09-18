import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import GoBackButton from '../components/GoBackButton';

const STATUS_LABEL = {
  pending: 'Pending review',
  under_review: 'Under review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

const STATUS_BADGE_CLASS = {
  pending: 'badge-warning',
  under_review: 'badge-neutral',
  confirmed: 'badge-success',
  rejected: 'badge-danger',
};

export default function MyReports() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/mine')
      .then((data) => setIncidents(data.incidents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>My reports</h1>
          <p className="page-subtitle">Signed in as {user?.name}</p>
        </div>
        <GoBackButton />
      </header>

      {loading && <p>Loading your reports...</p>}
      {error && <div className="auth-error">{error}</div>}

      {!loading && !error && incidents.length === 0 && (
        <div className="empty-state card">
          <h2>No reports yet</h2>
          <p>Reports you submit will show up here with their review status.</p>
        </div>
      )}

      <div className="report-grid">
        {incidents.map((incident) => (
          <div className="card report-card" key={incident.id}>
            <div className="report-card-top">
              <span className="report-plate">{incident.plate}</span>
              <span className={`badge ${STATUS_BADGE_CLASS[incident.status] || 'badge-neutral'}`}>
                {STATUS_LABEL[incident.status] || incident.status}
              </span>
            </div>
            <p className="report-meta">
              {incident.platform} · {incident.type} · {incident.severity} severity
            </p>
            <p className="report-description">{incident.description}</p>
            <p className="report-meta report-area">{incident.area}</p>
          </div>
        ))}
      </div>
    </div>
  );
}