import { useEffect, useState } from 'react';
import { getMyIncidents } from '../reportsApi';
import StatusBadge from './StatusBadge';

function MyReportsList({ refreshKey }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getMyIncidents();
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
      } else {
        setIncidents(result.incidents);
        setError(null);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <p className="text-center text-sm text-gray-500 py-8">Loading your reports...</p>;
  }

  if (error) {
    return <p className="text-center text-sm text-red-600 py-8">{error}</p>;
  }

  if (incidents.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 py-8">
        You haven't submitted any reports yet.
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">My Reports</h2>
      {incidents.map((incident) => (
        <div key={incident.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
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
          {incident.corroborationCount > 0 && (
            <p className="text-xs text-gray-500">
              {incident.corroborationCount} other passenger{incident.corroborationCount > 1 ? 's' : ''} reported a similar experience
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default MyReportsList;