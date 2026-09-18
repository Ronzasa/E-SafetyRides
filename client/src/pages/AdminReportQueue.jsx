import { useEffect, useMemo, useState } from 'react';
import { AdminAppShell, AppIcon, PageIntro, StatusPill } from '../components/SafetyAppShell';
import { api } from '../lib/api';

const TABS = ['pending', 'under_review', 'confirmed', 'rejected'];

const STATUS_META = {
  pending: { label: 'Pending', tone: 'amber' },
  under_review: { label: 'Under review', tone: 'blue' },
  confirmed: { label: 'Confirmed', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
};

const SEVERITY_META = {
  high: { label: 'High priority', tone: 'red' },
  medium: { label: 'Medium priority', tone: 'amber' },
  low: { label: 'Low priority', tone: 'green' },
};

function formatDate(value, withTime = true) {
  if (!value) return '—';
  const seconds = value.seconds ?? value._seconds;
  const date = value.toDate ? value.toDate() : seconds ? new Date(seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function statusMeta(status) {
  return STATUS_META[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), tone: 'neutral' };
}

function severityMeta(severity) {
  return SEVERITY_META[severity] || { label: `${severity || 'Unknown'} priority`, tone: 'neutral' };
}

function SearchableIncidentText(incident) {
  return [
    incident.plate,
    incident.driverName,
    incident.platform,
    incident.type,
    incident.area,
    incident.vehicleType,
    incident.description,
  ].filter(Boolean).join(' ').toLowerCase();
}

function QueueAction({ children, className = 'ghost', disabled, onClick }) {
  return (
    <button
      type="button"
      className={`app-button ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ModerationActions({ incident, status, actioning, onView, onModerate, compact = false }) {
  const disabled = actioning === incident.id;

  return (
    <div className={`admin-moderation-actions ${compact ? 'compact' : ''}`}>
      {!compact && (
        <QueueAction onClick={() => onView(incident.id)}>
          <AppIcon name="eye" size={15} /> View details
        </QueueAction>
      )}
      {status !== 'under_review' && (
        <QueueAction disabled={disabled} onClick={() => onModerate(incident.id, 'under_review')}>
          <AppIcon name="clock" size={15} /> Review
        </QueueAction>
      )}
      {status !== 'confirmed' && (
        <QueueAction className="primary" disabled={disabled} onClick={() => onModerate(incident.id, 'confirmed')}>
          <AppIcon name="check" size={15} /> Confirm
        </QueueAction>
      )}
      {status !== 'rejected' && (
        <QueueAction className="admin-button-danger" disabled={disabled} onClick={() => onModerate(incident.id, 'rejected')}>
          <AppIcon name="close" size={15} /> Reject
        </QueueAction>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="admin-detail-field">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export default function AdminReportQueue() {
  const [activeTab, setActiveTab] = useState('pending');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api.get(`/admin/reports?status=${activeTab}`)
      .then((data) => {
        if (!cancelled) setIncidents(data.incidents || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab]);

  useEffect(() => {
    if (!selectedId) return undefined;

    let cancelled = false;
    api.get(`/admin/reports/${selectedId}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedId]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return incidents;
    return incidents.filter((incident) => SearchableIncidentText(incident).includes(query));
  }, [incidents, search]);

  const selectedIncident = incidents.find((incident) => incident.id === selectedId);
  const activeMeta = statusMeta(activeTab);

  function handleTabChange(tab) {
    if (tab === activeTab) return;
    setSearch('');
    setSelectedId(null);
    setError('');
    setLoading(true);
    setActiveTab(tab);
  }

  function handleSelect(id) {
    setDetail(null);
    setDetailLoading(true);
    setSelectedId(id);
  }

  async function handleModerate(id, newStatus) {
    setActioningId(id);
    setError('');
    try {
      await api.patch(`/admin/reports/${id}`, { status: newStatus });
      setIncidents((current) => current.filter((incident) => incident.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  const queueTitle = `${activeMeta.label} reports`;

  return (
    <AdminAppShell>
      <div className="app-content admin-content">
        <PageIntro
          eyebrow="Moderation centre"
          title="Review queue"
          description="Assess incoming safety reports carefully, review supporting context, and record the right moderation outcome."
          action={(
            <span className="admin-header-stat">
              <AppIcon name="clock" size={16} /> {incidents.length} in queue
            </span>
          )}
        />

        {error && <div className="auth-error">{error}</div>}

        <section className="admin-queue-toolbar app-card" aria-label="Review queue filters">
          <div className="admin-status-tabs" role="tablist" aria-label="Report status">
            {TABS.map((tab) => {
              const meta = statusMeta(tab);
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? 'active' : ''}
                  onClick={() => handleTabChange(tab)}
                >
                  <span className={`tab-indicator ${meta.tone}`} />{meta.label}
                </button>
              );
            })}
          </div>
          <label className="admin-search-control">
            <AppIcon name="search" size={16} />
            <span className="sr-only">Search reports</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search plate, driver, area..."
            />
          </label>
        </section>

        {loading && <p className="workflow-loading">Loading reports...</p>}

        {!loading && (
          <section className="admin-queue-section" aria-live="polite">
            <div className="admin-section-heading">
              <div>
                <span className="section-kicker">Current workload</span>
                <h2>{queueTitle}</h2>
              </div>
              <span>{filteredIncidents.length} shown</span>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="app-card admin-empty-state">
                <span className="admin-empty-icon"><AppIcon name="review" size={20} /></span>
                <h2>{search ? 'No reports match your search' : `No ${activeMeta.label.toLowerCase()} reports`}</h2>
                <p>{search ? 'Try a different plate, location, driver name, or platform.' : 'This section is clear for now. New reports will appear here when they need attention.'}</p>
              </div>
            ) : (
              <div className="admin-queue-list">
                {filteredIncidents.map((incident) => {
                  const severity = severityMeta(incident.severity);
                  return (
                    <article className="app-card admin-review-card" key={incident.id}>
                      <div className="admin-review-card-top">
                        <div className="admin-review-title">
                          <span className={`severity-dot ${severity.tone}`} />
                          <div>
                            <span className="plate-label">{incident.plate || 'Plate not provided'}</span>
                            <h3>{incident.type || 'Safety report'}</h3>
                          </div>
                        </div>
                        <div className="admin-review-pills">
                          <StatusPill tone={severity.tone}>{severity.label}</StatusPill>
                          <StatusPill tone={activeMeta.tone}>{activeMeta.label}</StatusPill>
                        </div>
                      </div>

                      <p className="admin-review-description">{incident.description || 'No incident description was provided.'}</p>

                      <div className="admin-review-facts">
                        <span>{incident.area || 'Area not provided'}</span>
                        <span>{incident.platform || 'Platform not provided'}</span>
                        <span>{incident.driverName || 'Driver not named'}</span>
                        <span>Reported {formatDate(incident.createdAt, false)}</span>
                      </div>

                      <div className="admin-review-footer">
                        <div className="admin-evidence-summary">
                          {incident.evidenceUrls?.length > 0 && <span>{incident.evidenceUrls.length} evidence image{incident.evidenceUrls.length === 1 ? '' : 's'}</span>}
                          {incident.corroborationCount > 0 && <span>{incident.corroborationCount} corroboration{incident.corroborationCount === 1 ? '' : 's'}</span>}
                          {!incident.evidenceUrls?.length && !incident.corroborationCount && <span>No supporting submissions yet</span>}
                        </div>
                        <ModerationActions
                          incident={incident}
                          status={activeTab}
                          actioning={actioningId}
                          onView={handleSelect}
                          onModerate={handleModerate}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {selectedId && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setSelectedId(null)}>
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-modal-header">
              <div>
                <span className="section-kicker">Moderation record</span>
                <h2 id="report-detail-title">Report details</h2>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setSelectedId(null)} aria-label="Close report details">
                <AppIcon name="close" size={18} />
              </button>
            </header>

            {detailLoading && <p className="workflow-loading">Loading full report...</p>}

            {!detailLoading && detail && (() => {
              const incident = detail.incident;
              const status = statusMeta(incident.status);
              const severity = severityMeta(incident.severity);

              return (
                <>
                  <div className="admin-detail-pills">
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    <StatusPill tone={severity.tone}>{severity.label}</StatusPill>
                  </div>

                  <div className="admin-detail-grid">
                    <DetailField label="Plate" value={incident.plate} />
                    <DetailField label="Driver name" value={incident.driverName} />
                    <DetailField label="Platform" value={incident.platform} />
                    <DetailField label="Vehicle type" value={incident.vehicleType} />
                    <DetailField label="Incident type" value={incident.type} />
                    <DetailField label="Area" value={incident.area} />
                    <DetailField label="Reported" value={formatDate(incident.createdAt)} />
                    <DetailField label="Last updated" value={incident.updatedAt ? formatDate(incident.updatedAt) : null} />
                  </div>

                  <section className="admin-detail-section">
                    <h3>Description</h3>
                    <p>{incident.description || 'No incident description was provided.'}</p>
                  </section>

                  {incident.evidenceUrls?.length > 0 && (
                    <section className="admin-detail-section">
                      <h3>Evidence <span>({incident.evidenceUrls.length})</span></h3>
                      <div className="admin-evidence-grid">
                        {incident.evidenceUrls.map((url, index) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="admin-evidence-thumb">
                            <img src={url} alt={`Evidence ${index + 1}`} />
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {detail.reporter && (
                    <section className="admin-detail-section">
                      <h3>Reporter</h3>
                      <p>{detail.reporter.name} <span>{detail.reporter.email}</span></p>
                    </section>
                  )}

                  {detail.corroborations?.length > 0 && (
                    <section className="admin-detail-section">
                      <h3>Corroborations <span>({detail.corroborations.length})</span></h3>
                      <div className="admin-corroboration-list">
                        {detail.corroborations.map((corroboration) => (
                          <article key={corroboration.id}>
                            <p>{corroboration.note || 'No note was provided.'}</p>
                            <span>{formatDate(corroboration.createdAt)}</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  <footer className="admin-modal-footer">
                    <span>Choose a moderation outcome</span>
                    <ModerationActions
                      incident={incident}
                      status={incident.status}
                      actioning={actioningId}
                      onView={setSelectedId}
                      onModerate={handleModerate}
                      compact
                    />
                  </footer>
                </>
              );
            })()}

            {!detailLoading && !detail && selectedIncident && (
              <div className="admin-detail-fallback">
                <p className="auth-error">Could not load the full report details.</p>
                <p>{selectedIncident.description || 'No incident description was provided.'}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminAppShell>
  );
}
