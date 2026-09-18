import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon, EmptyState, PageIntro, SafetyAppShell } from '../../../components/SafetyAppShell';
import { getIncidents } from '../reportsApi';
import IncidentCard from './IncidentCard';

const PLATFORMS = ['uber', 'bolt', 'indrive', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];

function BrowseReports() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ area: '', platform: '', severity: '' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getIncidents(filters);
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
      } else {
        setIncidents(result.incidents || []);
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

  const visibleIncidents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return incidents;
    return incidents.filter((incident) => [
      incident.plate,
      incident.area,
      incident.platform,
      incident.type,
      incident.description,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
  }, [incidents, query]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <SafetyAppShell>
      <div className="app-content">
        <PageIntro
          eyebrow="Passenger intelligence"
          title="Browse reports"
          description="Moderated safety signals from passengers across the community."
          action={(
            <Link className="app-button primary" to="/report">
              <AppIcon name="plus" size={16} /> Report incident
            </Link>
          )}
        />

        <div className="browse-toolbar">
          <label className="search-field">
            <AppIcon name="search" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by plate, area, or incident"
              aria-label="Search reports"
            />
          </label>
          <details className="filter-control">
            <summary>
              <span className="filter-control-label">Filters</span>
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </summary>
            <div className="filter-popover">
              <label>
                Area
                <input name="area" value={filters.area} onChange={handleFilterChange} placeholder="Any area" />
              </label>
              <label>
                Platform
                <select name="platform" value={filters.platform} onChange={handleFilterChange}>
                  <option value="">All platforms</option>
                  {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </label>
              <label>
                Severity
                <select name="severity" value={filters.severity} onChange={handleFilterChange}>
                  <option value="">All severities</option>
                  {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                </select>
              </label>
            </div>
          </details>
        </div>

        {loading && <p className="workflow-loading">Loading reports...</p>}
        {error && <div className="auth-error">{error}</div>}
        {!loading && !error && visibleIncidents.length === 0 && (
          <EmptyState
            title="No reports match these filters"
            description="Try adjusting your filters or check back later."
            to="/report"
            action="Report an incident"
          />
        )}

        {!loading && !error && visibleIncidents.length > 0 && (
          <div className="report-list">
            {visibleIncidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}
          </div>
        )}

        <p className="disclaimer">
          Reports are community-submitted and independently moderated. They are signals to help you ask better questions, not definitive proof of wrongdoing.
        </p>
      </div>
    </SafetyAppShell>
  );
}

export default BrowseReports;
