import { useEffect, useState } from 'react';
import { getIncidents } from '../reportsApi';
import IncidentCard from './IncidentCard';

const PLATFORMS = ['uber', 'bolt', 'indrive', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];

function BrowseReports() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ area: '', platform: '', severity: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getIncidents(filters);
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
  }, [filters]);

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Browse Reports</h2>
        <p className="text-sm text-gray-500">
          Reports are shown as safety signals from other passengers, not confirmed accusations.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input
          name="area"
          value={filters.area}
          onChange={handleFilterChange}
          placeholder="Area"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="platform"
          value={filters.platform}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          name="severity"
          value={filters.severity}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-sm text-gray-500 py-8">Loading reports...</p>}
      {error && <p className="text-center text-sm text-red-600 py-8">{error}</p>}
      {!loading && !error && incidents.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-8">No reports match these filters.</p>
      )}

      <div className="space-y-4">
        {incidents.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}

export default BrowseReports;