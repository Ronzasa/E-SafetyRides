import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TABS = ['pending', 'under_review', 'confirmed', 'rejected'];

const TAB_LABEL = {
  pending: 'Pending',
  under_review: 'Under review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

export default function AdminReportQueue() {
  const [activeTab, setActiveTab] = useState('pending');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  function loadIncidents(status) {
    setLoading(true);
    setError('');
    api.get(`/admin/reports?status=${status}`)
      .then((data) => setIncidents(data.incidents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadIncidents(activeTab);
  }, [activeTab]);

  async function handleModerate(id, newStatus) {
    setActioningId(id);
    try {
      await api.patch(`/admin/reports/${id}`, { status: newStatus });
      setIncidents((prev) => prev.filter((incident) => incident.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Report review queue</h1>
          <p className="page-subtitle">Moderate incoming safety reports</p>
        </div>
      </header>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      {error && <div className="auth-error">{error}</div>}
      {loading && <p>Loading reports...</p>}

      {!loading && incidents.length === 0 && (
        <div className="empty-state card">
          <h2>Nothing here</h2>
          <p>No reports currently have "{TAB_LABEL[activeTab]}" status.</p>
        </div>
      )}

      <div className="report-grid">
        {incidents.map((incident) => (
          <div className="card report-card" key={incident.id}>
            <div className="report-card-top">
              <span className="report-plate">{incident.plate}</span>
              <span className="report-meta">{incident.area}</span>
            </div>
            <p className="report-meta">
              {incident.platform} · {incident.type} · {incident.severity} severity
            </p>
            <p className="report-description">{incident.description}</p>

            <div className="moderation-actions">
              {activeTab !== 'under_review' && (
                <button
                  className="btn-secondary"
                  disabled={actioningId === incident.id}
                  onClick={() => handleModerate(incident.id, 'under_review')}
                >
                  Mark under review
                </button>
              )}
              {activeTab !== 'confirmed' && (
                <button
                  className="btn-action btn-action-success"
                  disabled={actioningId === incident.id}
                  onClick={() => handleModerate(incident.id, 'confirmed')}
                >
                  Confirm
                </button>
              )}
              {activeTab !== 'rejected' && (
                <button
                  className="btn-action btn-action-danger"
                  disabled={actioningId === incident.id}
                  onClick={() => handleModerate(incident.id, 'rejected')}
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}