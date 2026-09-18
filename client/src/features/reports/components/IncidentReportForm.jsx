import { useState } from 'react';
import { createIncident, uploadEvidence } from '../reportsApi';

const PLATFORMS = ['uber', 'bolt', 'indrive', 'other'];
const VEHICLE_TYPES = ['sedan', 'hatchback', 'suv', 'minibus', 'other'];
const INCIDENT_TYPES = ['unsafe_driving', 'harassment', 'robbery', 'assault', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];

// New reports require the full 8-character plate (all caps, letters/digits
// only). The server enforces the same rule, and driver search accepts 1-8,
// so anything accepted here is guaranteed to be searchable once confirmed.
const PLATE_CHAR_REGEX = /[^A-Za-z0-9]/g;
const PLATE_MAX_LENGTH = 8;
const PLATE_FORMAT_REGEX = /^[A-Z0-9]{8}$/;

// Every compulsory field on the form, paired with the label used in the
// error message when submission is attempted with fields still empty.
const REQUIRED_FIELDS = [
  ['plate', 'plate number'],
  ['platform', 'platform'],
  ['vehicleType', 'vehicle type'],
  ['type', 'incident type'],
  ['severity', 'severity'],
  ['area', 'area'],
  ['description', 'description'],
];

function IncidentReportForm({ onSuccess }) {
  const [form, setForm] = useState({
    plate: '', driverName: '', platform: '', vehicleType: '',
    type: '', severity: '', description: '', area: '',
  });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    if (e.target.name === 'plate') {
      // Normalise while typing — uppercase, letters/digits only, max 8 chars.
      const value = e.target.value.replace(PLATE_CHAR_REGEX, '').toUpperCase().slice(0, PLATE_MAX_LENGTH);
      setForm({ ...form, plate: value });
      return;
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    // Belt-and-braces guard: the browser's `required` attributes normally
    // block this first, but submission must never go through with any
    // compulsory field missing.
    const missing = REQUIRED_FIELDS.filter(([field]) => !String(form[field] ?? '').trim());
    if (missing.length > 0) {
      setError(`Please fill in all compulsory fields: ${missing.map(([, label]) => label).join(', ')}.`);
      return;
    }
    if (!PLATE_FORMAT_REGEX.test(form.plate.trim())) {
      setError('Plate numbers must be exactly 8 letters/digits (all caps), e.g. ABC123GP.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createIncident(form);
      if (!result.success) {
        setError(result.error || 'Something went wrong');
        setSubmitting(false);
        return;
      }
      if (evidenceFile) {
        await uploadEvidence(result.incident.id, evidenceFile);
      }
      setSubmitting(false);
      onSuccess?.(result.incident);
    } catch {
      setError('Network error — please try again');
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <form onSubmit={handleSubmit} className="form-card">
        <h2>Report an incident</h2>
        <p className="form-hint">
          Your report will be reviewed before it appears as a safety signal to other passengers.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-field">
          <label htmlFor="plate">Plate number</label>
          <input id="plate" name="plate" value={form.plate} onChange={handleChange} maxLength={PLATE_MAX_LENGTH} placeholder="e.g. ABC123GP" required />
        </div>

        <div className="form-field">
          <label htmlFor="driverName">Driver name (optional)</label>
          <input id="driverName" name="driverName" value={form.driverName} onChange={handleChange} />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="platform">Platform</label>
            <select id="platform" name="platform" value={form.platform} onChange={handleChange} required>
              <option value="">Select...</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="vehicleType">Vehicle type</label>
            <select id="vehicleType" name="vehicleType" value={form.vehicleType} onChange={handleChange} required>
              <option value="">Select...</option>
              {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="type">Incident type</label>
            <select id="type" name="type" value={form.type} onChange={handleChange} required>
              <option value="">Select...</option>
              {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="severity">Severity</label>
            <select id="severity" name="severity" value={form.severity} onChange={handleChange} required>
              <option value="">Select...</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="area">Area</label>
          <input id="area" name="area" value={form.area} onChange={handleChange} required placeholder="e.g. Braamfontein, Johannesburg" />
        </div>

        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={form.description} onChange={handleChange} required rows={4} />
        </div>

        <div className="form-field">
          <label htmlFor="evidence">Evidence (optional)</label>
          <input id="evidence" type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '1.5rem', width: '100%' }}>
          {submitting ? 'Submitting...' : 'Submit report'}
        </button>
      </form>
    </div>
  );
}

export default IncidentReportForm;