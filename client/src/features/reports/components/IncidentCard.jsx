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
    <div className="max-w-lg mx-auto border border-gray-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{incident.plate}</p>
          <p className="text-sm text-gray-500 capitalize">
            {incident.platform} &middot; {incident.type.replace('_', ' ')} &middot; {incident.area}
          </p>
        </div>
        <StatusBadge status={incident.status} />
      </div>

      <p className="text-sm text-gray-700">{incident.description}</p>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">
          {corroborations.length === 0
            ? 'No one else has reported a similar experience yet.'
            : `${corroborations.length} passenger${corroborations.length > 1 ? 's have' : ' has'} reported something similar.`}
        </p>

        {corroborations.map((c) => (
          c.note && (
            <p key={c.id} className="text-sm text-gray-600 bg-gray-50 rounded-md p-2 mb-1">
              {c.note}
            </p>
          )
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-2 rounded-md">{error}</div>}

      {corroborated ? (
        <p className="text-sm text-gray-500">Thanks — your report has been added.</p>
      ) : (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about your own experience (optional)"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCorroborate}
            disabled={submitting}
            className="w-full rounded-md bg-gray-800 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : "I've had a similar experience"}
          </button>
        </div>
      )}
    </div>
  );
}

export default IncidentCard;