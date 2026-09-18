import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon, PageIntro, SafetyAppShell } from '../../../components/SafetyAppShell';
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
      const value = e.target.value.replace(PLATE_CHAR_REGEX, '').toUpperCase().slice(0, PLATE_MAX_LENGTH);
      setForm({ ...form, plate: value });
      return;
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
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
    <SafetyAppShell>
      <div className="app-content">
        <PageIntro
          eyebrow="Community reporting"
          title="Report an incident"
          description="Share what happened so other passengers can make informed decisions. Your report is reviewed before it becomes visible."
        />

        <div className="form-layout">
          <form onSubmit={handleSubmit} className="app-card report-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-section-title">
              <span>01</span>
              <div>
                <h2>Ride details</h2>
                <p>Tell us which ride this relates to.</p>
              </div>
            </div>

            <div className="field-grid">
              <label htmlFor="plate">
                Plate number
                <input id="plate" name="plate" value={form.plate} onChange={handleChange} maxLength={PLATE_MAX_LENGTH} placeholder="e.g. ABC123GP" required />
              </label>
              <label htmlFor="driverName">
                Driver name <em>Optional</em>
                <input id="driverName" name="driverName" value={form.driverName} onChange={handleChange} placeholder="If known" />
              </label>
              <label htmlFor="platform">
                Platform
                <select id="platform" name="platform" value={form.platform} onChange={handleChange} required>
                  <option value="">Select platform</option>
                  {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </label>
              <label htmlFor="vehicleType">
                Vehicle type
                <select id="vehicleType" name="vehicleType" value={form.vehicleType} onChange={handleChange} required>
                  <option value="">Select vehicle type</option>
                  {VEHICLE_TYPES.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}
                </select>
              </label>
              <label className="field-full" htmlFor="area">
                Area
                <input id="area" name="area" value={form.area} onChange={handleChange} required placeholder="e.g. Braamfontein, Johannesburg" />
              </label>
            </div>

            <div className="form-section-title">
              <span>02</span>
              <div>
                <h2>What happened?</h2>
                <p>Keep it factual and specific.</p>
              </div>
            </div>

            <div className="field-grid">
              <label htmlFor="type">
                Incident type
                <select id="type" name="type" value={form.type} onChange={handleChange} required>
                  <option value="">Select incident type</option>
                  {INCIDENT_TYPES.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                </select>
              </label>
              <label htmlFor="severity">
                Severity
                <select id="severity" name="severity" value={form.severity} onChange={handleChange} required>
                  <option value="">Choose severity</option>
                  {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                </select>
              </label>
            </div>

            <label htmlFor="description">
              Description
              <textarea id="description" name="description" value={form.description} onChange={handleChange} required rows={5} placeholder="Describe what happened, without sharing personal information about yourself or others." />
            </label>

            <label htmlFor="evidence" className="upload-box">
              <AppIcon name="file" size={18} />
              <span>
                <strong>{evidenceFile ? evidenceFile.name : 'Add evidence'}</strong>
                <small>Optional photo or screenshot · JPG or PNG</small>
              </span>
              <input id="evidence" type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
            </label>

            <div className="form-note">
              <span>!</span>
              <span>Only submit reports based on your own experience. False or malicious reports may be removed.</span>
            </div>

            <button type="submit" className="app-button primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>

          <aside className="side-note">
            <div className="side-note-icon"><AppIcon name="shield" size={18} /></div>
            <h3>Your privacy comes first</h3>
            <p>Your identity is never displayed alongside a public report. We remove identifying details and moderate every submission.</p>
            <Link to="/browse">See community guidelines <AppIcon name="arrow" size={14} /></Link>
          </aside>
        </div>
      </div>
    </SafetyAppShell>
  );
}

export default IncidentReportForm;
