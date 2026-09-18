import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  AppIcon,
  EmptyState,
  Metric,
  PageIntro,
  SafetyAppShell,
  StatusPill,
} from '../components/SafetyAppShell';

const STATUS_LABEL = {
  pending: 'Under review',
  under_review: 'Under review',
  confirmed: 'Published',
  rejected: 'Not published',
};

const STATUS_TONE = {
  pending: 'amber',
  under_review: 'amber',
  confirmed: 'green',
  rejected: 'neutral',
};

function formatIncidentType(type) {
  return String(type || 'Safety report').replace(/_/g, ' ');
}

function formatDate(value) {
  if (!value) return 'Recently submitted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently submitted';
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function reportNote(status) {
  if (status === 'confirmed') {
    return 'This report is now helping passengers make safer choices.';
  }
  if (status === 'rejected') {
    return 'This report was not published as a community safety signal.';
  }
  return 'Our moderation team is checking the details you shared.';
}

function reportReference(id) {
  return `ESR-${String(id || '').slice(-6).toUpperCase() || 'REPORT'}`;
}

export default function MyReports() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/mine')
      .then((data) => setIncidents(data.incidents || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const confirmedCount = incidents.filter((incident) => incident.status === 'confirmed').length;
  const reviewCount = incidents.filter((incident) => (
    incident.status === 'pending' || incident.status === 'under_review'
  )).length;
  const reportCount = String(incidents.length).padStart(2, '0');

  return (
    <SafetyAppShell>
      <div className="app-content reports-page">
        <PageIntro
          eyebrow="Your contribution"
          title="My reports"
          description="Keep track of the safety signals you have shared with the community."
          action={(
            <Link className="app-button primary" to="/report">
              <AppIcon name="plus" size={16} /> New report
            </Link>
          )}
        />

        <section className="reports-overview" aria-label="Report overview">
          <div className="overview-copy">
            <span className="overview-kicker"><AppIcon name="shield" size={14} /> Community impact</span>
            <h2>Your voice makes every ride safer.</h2>
            <p>Every thoughtful report helps the next passenger ask better questions before getting in.</p>
          </div>
          <div className="overview-score">
            <strong>{reportCount}</strong>
            <span>signals shared</span>
            <div className="overview-progress"><span style={{ width: `${Math.min(100, incidents.length * 25)}%` }} /></div>
            <small>Keep contributing to safer rides</small>
          </div>
        </section>

        {loading && <p className="workflow-loading">Loading your reports...</p>}
        {error && <div className="auth-error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="metrics-row" aria-label="Report metrics">
              <Metric value={reportCount} label="Total reports" />
              <Metric value={String(confirmedCount).padStart(2, '0')} label="Published signals" />
              <Metric value={String(reviewCount).padStart(2, '0')} label="Under review" />
            </div>

            {incidents.length === 0 ? (
              <EmptyState
                title="No reports yet"
                description="Reports you submit will appear here with their review status."
                to="/report"
                action="Report an incident"
              />
            ) : (
              <section className="report-list-section" aria-labelledby="report-list-title">
                <div className="section-heading">
                  <div>
                    <span className="app-eyebrow"><span /> Activity</span>
                    <h2 id="report-list-title">Your submitted reports</h2>
                  </div>
                  <span className="section-count">{incidents.length} report{incidents.length === 1 ? '' : 's'}</span>
                </div>
                <div className="reports-table-card">
                  {incidents.map((incident) => (
                    <article className="my-report-row" key={incident.id}>
                      <div className="report-file-icon"><AppIcon name="file" size={19} /></div>
                      <div className="my-report-main">
                        <strong>{formatIncidentType(incident.type)}</strong>
                        <span>{incident.plate} · submitted {formatDate(incident.createdAt || incident.created_at)}</span>
                        <small>{reportNote(incident.status)}</small>
                      </div>
                      <StatusPill tone={STATUS_TONE[incident.status] || 'neutral'}>
                        {STATUS_LABEL[incident.status] || incident.status || 'Submitted'}
                      </StatusPill>
                      <span className="report-id">{reportReference(incident.id)}</span>
                      <Link to="/browse" aria-label={`Browse safety reports related to ${incident.plate || 'this report'}`}>
                        <AppIcon name="arrow" size={17} />
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="report-next-step">
              <div className="next-step-icon"><AppIcon name="file" size={18} /></div>
              <div>
                <strong>What happens next?</strong>
                <p>Reports are reviewed with care. Published signals are anonymized and visible to other passengers.</p>
              </div>
              <Link to="/browse">See community signals <AppIcon name="arrow" size={15} /></Link>
            </section>
          </>
        )}

        <div className="privacy-banner">
          <div>
            <strong>Your reports stay yours.</strong>
            <p>We never show your name publicly. You can request an update or removal from the moderation team.</p>
          </div>
          <Link to="/browse">Read our privacy approach</Link>
        </div>
      </div>
    </SafetyAppShell>
  );
}
