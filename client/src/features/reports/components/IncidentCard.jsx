import { useEffect, useState } from 'react';
import { StatusPill } from '../../../components/SafetyAppShell';
import { addCorroboration, getCorroborations } from '../reportsApi';

function formatType(type) {
  return String(type || 'Safety report').replace(/_/g, ' ');
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function severityTone(severity) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'green';
}

function IncidentCard({ incident }) {
  const [corroborations, setCorroborations] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [corroborated, setCorroborated] = useState(false);

  useEffect(() => {
    getCorroborations(incident.id).then((result) => {
      if (result.success) setCorroborations(result.corroborations);
    });
  }, [incident.id]);

  async function handleCorroborate() {
    setSubmitting(true);
    setError(null);
    const result = await addCorroboration(incident.id, note || null);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCorroborated(true);
    setNote('');
    const refreshed = await getCorroborations(incident.id);
    if (refreshed.success) setCorroborations(refreshed.corroborations);
  }

  const submittedDate = formatDate(incident.createdAt || incident.created_at);

  return (
    <article className="browse-report">
      <div className="report-heading">
        <div>
          <span className="plate-label">{incident.plate || 'PLATE NOT RECORDED'}</span>
          <h2>{formatType(incident.type)}</h2>
        </div>
        <StatusPill tone={severityTone(incident.severity)}>
          {incident.severity ? `${incident.severity} severity` : 'Safety signal'}
        </StatusPill>
      </div>

      <p className="report-copy">{incident.description}</p>

      <div className="report-footer">
        {incident.area && <span>{incident.area}</span>}
        {incident.platform && <span>{incident.platform}</span>}
        {submittedDate && <span>{submittedDate}</span>}
        <span className="moderated">Moderated</span>
      </div>

      <div className="corroboration-divider">
        <p className="text-muted-sm">
          {corroborations.length === 0
            ? 'No one else has reported a similar experience yet.'
            : `${corroborations.length} passenger${corroborations.length > 1 ? 's have' : ' has'} reported something similar.`}
        </p>
        {corroborations.map((corroboration) => corroboration.note && (
          <p key={corroboration.id} className="corroboration-note">{corroboration.note}</p>
        ))}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {corroborated ? (
        <p className="corroboration-success">Thanks — your report has been added.</p>
      ) : (
        <div className="corroboration-form">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about your own experience (optional)"
            rows={2}
          />
          <button
            type="button"
            className="app-button ghost"
            onClick={handleCorroborate}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : "I've had a similar experience"}
          </button>
        </div>
      )}
    </article>
  );
}

export default IncidentCard;
