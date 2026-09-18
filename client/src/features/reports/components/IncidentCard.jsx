import { useEffect, useState } from 'react';
import { addCorroboration, getCorroborations } from '../reportsApi';
import StatusBadge from './StatusBadge';

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

  return (
    <div className="card report-card">
      <div className="report-card-top">
        <div>
          <p className="report-plate">{incident.plate}</p>
          <p className="report-meta">
            {incident.platform} · {incident.type.replace('_', ' ')} · {incident.area}
          </p>
        </div>
        <StatusBadge status={incident.status} />
      </div>

      <p className="report-description">{incident.description}</p>

      <div className="corroboration-divider">
        <p className="text-muted-sm">
          {corroborations.length === 0
            ? 'No one else has reported a similar experience yet.'
            : `${corroborations.length} passenger${corroborations.length > 1 ? 's have' : ' has'} reported something similar.`}
        </p>
        {corroborations.map((c) => c.note && (
          <p key={c.id} className="corroboration-note">{c.note}</p>
        ))}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {corroborated ? (
        <p className="text-muted-sm">Thanks — your report has been added.</p>
      ) : (
        <div className="form-field" style={{ marginTop: '0.75rem' }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about your own experience (optional)"
            rows={2}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCorroborate}
            disabled={submitting}
            style={{ marginTop: '0.5rem' }}
          >
            {submitting ? 'Submitting...' : "I've had a similar experience"}
          </button>
        </div>
      )}
    </div>
  );
}

export default IncidentCard;