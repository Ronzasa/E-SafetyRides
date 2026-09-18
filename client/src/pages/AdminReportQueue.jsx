import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TABS = ['pending', 'under_review', 'confirmed', 'rejected'];

const TAB_LABEL = {
  pending: 'Pending',
  under_review: 'Under review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

const SEVERITY_COLOR = {
  high: 'var(--color-danger)',
  medium: 'var(--color-warning)',
  low: 'var(--color-success)',
};

function formatDate(d) {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminReportQueue() {
  const [activeTab, setActiveTab] = useState('pending');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/admin/reports?status=${activeTab}`)
      .then((data) => {
        if (!cancelled) setIncidents(data.incidents);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Fetch full detail when a report is selected
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    api.get(`/admin/reports/${selectedId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  function handleTabChange(tab) {
    if (tab === activeTab) return;
    setError('');
    setLoading(true);
    setActiveTab(tab);
  }

  async function handleModerate(id, newStatus) {
    setActioningId(id);
    try {
      await api.patch(`/admin/reports/${id}`, { status: newStatus });
      setIncidents((prev) => prev.filter((incident) => incident.id !== id));
      // If the detail panel is open for this incident, close it
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  const selectedIncident = incidents.find((i) => i.id === selectedId);

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
            onClick={() => handleTabChange(tab)}
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
          <p>No reports currently have &ldquo;{TAB_LABEL[activeTab]}&rdquo; status.</p>
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

            {(incident.evidenceUrls?.length > 0 || incident.corroborationCount > 0) && (
              <p className="report-meta" style={{ fontSize: '0.8rem' }}>
                {incident.evidenceUrls?.length > 0 && `${incident.evidenceUrls.length} evidence image${incident.evidenceUrls.length > 1 ? 's' : ''}`}
                {incident.evidenceUrls?.length > 0 && incident.corroborationCount > 0 && ' · '}
                {incident.corroborationCount > 0 && `${incident.corroborationCount} corroboration${incident.corroborationCount > 1 ? 's' : ''}`}
              </p>
            )}

            <div className="moderation-actions">
              <button
                className="btn-secondary"
                onClick={() => setSelectedId(incident.id)}
              >
                View details
              </button>
              {activeTab !== 'under_review' && (
                <button
                  className="btn-secondary"
                  disabled={actioningId === incident.id}
                  onClick={() => handleModerate(incident.id, 'under_review')}
                >
                  Under review
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

      {/* ── Detail modal ── */}
      {selectedId && (
        <div className="modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report details</h2>
              <button className="modal-close" onClick={() => setSelectedId(null)}>&times;</button>
            </div>

            {detailLoading && <p>Loading full report...</p>}

            {!detailLoading && detail && (
              <>
                {(() => {
                  const inc = detail.incident;
                  return (
                    <>
                      {/* Status + severity bar */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${inc.status === 'confirmed' ? 'badge-success' : inc.status === 'rejected' ? 'badge-danger' : inc.status === 'under_review' ? 'badge-neutral' : 'badge-warning'}`}>
                          {TAB_LABEL[inc.status] || inc.status}
                        </span>
                        <span className="badge" style={{ background: `${SEVERITY_COLOR[inc.severity]}22`, color: SEVERITY_COLOR[inc.severity] }}>
                          {inc.severity} severity
                        </span>
                      </div>

                      {/* Core info grid */}
                      <div className="detail-grid">
                        <DetailField label="Plate" value={inc.plate} />
                        <DetailField label="Driver name" value={inc.driverName || '—'} />
                        <DetailField label="Platform" value={inc.platform} />
                        <DetailField label="Vehicle type" value={inc.vehicleType} />
                        <DetailField label="Incident type" value={inc.type} />
                        <DetailField label="Area" value={inc.area} />
                        <DetailField label="Reported" value={formatDate(inc.createdAt)} />
                        {inc.updatedAt && <DetailField label="Last updated" value={formatDate(inc.updatedAt)} />}
                      </div>

                      {/* Description */}
                      <div style={{ marginTop: '1.25rem' }}>
                        <h4 className="detail-label">Description</h4>
                        <p style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>{inc.description}</p>
                      </div>

                      {/* Evidence images */}
                      {inc.evidenceUrls?.length > 0 && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <h4 className="detail-label">Evidence ({inc.evidenceUrls.length})</h4>
                          <div className="evidence-grid">
                            {inc.evidenceUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="evidence-thumb">
                                <img src={url} alt={`Evidence ${i + 1}`} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reporter (admin-only) */}
                      {detail.reporter && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <h4 className="detail-label">Reporter</h4>
                          <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                            {detail.reporter.name} <span className="text-muted-sm">({detail.reporter.email})</span>
                          </p>
                        </div>
                      )}

                      {/* Corroborations */}
                      {detail.corroborations?.length > 0 && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <h4 className="detail-label">Corroborations ({detail.corroborations.length})</h4>
                          {detail.corroborations.map((c) => (
                            <div key={c.id} className="corroboration-note">
                              {c.note || <span className="text-muted-sm">(no note)</span>}
                              <div className="text-muted-sm" style={{ marginTop: '0.2rem' }}>{formatDate(c.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Moderation actions in modal */}
                      <div className="moderation-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                        {activeTab !== 'under_review' && (
                          <button className="btn-secondary" disabled={actioningId === selectedId} onClick={() => handleModerate(selectedId, 'under_review')}>
                            Mark under review
                          </button>
                        )}
                        {activeTab !== 'confirmed' && (
                          <button className="btn-action btn-action-success" disabled={actioningId === selectedId} onClick={() => handleModerate(selectedId, 'confirmed')}>
                            Confirm
                          </button>
                        )}
                        {activeTab !== 'rejected' && (
                          <button className="btn-action btn-action-danger" disabled={actioningId === selectedId} onClick={() => handleModerate(selectedId, 'rejected')}>
                            Reject
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}

            {!detailLoading && !detail && selectedIncident && (
              <>
                <p className="auth-error">Could not load full report details.</p>
                <p className="report-description">{selectedIncident.description}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <div className="detail-label">{label}</div>
      <div style={{ fontSize: '0.95rem', marginTop: '0.15rem', textTransform: 'capitalize' }}>{value || '—'}</div>
    </div>
  );
}
