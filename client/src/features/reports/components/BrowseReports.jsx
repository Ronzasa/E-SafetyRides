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
    return () => { cancelled = true; };
  }, [filters]);

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Browse reports</h1>
          <p className="page-subtitle">Safety signals from other passengers — not confirmed accusations.</p>
        </div>
      </header>

      <div className="filter-bar">
        <input name="area" value={filters.area} onChange={handleFilterChange} placeholder="Area" />
        <select name="platform" value={filters.platform} onChange={handleFilterChange}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select name="severity" value={filters.severity} onChange={handleFilterChange}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p className="text-muted-sm">Loading reports...</p>}
      {error && <div className="auth-error">{error}</div>}
      {!loading && !error && incidents.length === 0 && (
        <div className="empty-state card">
          <h2>No reports match these filters</h2>
          <p>Try adjusting your filters or check back later.</p>
        </div>
      )}

      <div className="report-grid">
        {incidents.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>
    </div>
  );
}

export default BrowseReports;