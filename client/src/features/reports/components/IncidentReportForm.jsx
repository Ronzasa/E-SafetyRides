import { useState } from 'react';
import { createIncident, uploadEvidence } from '../reportsApi';

const PLATFORMS = ['uber', 'bolt', 'indrive', 'other'];
const VEHICLE_TYPES = ['sedan', 'hatchback', 'suv', 'minibus', 'other'];
const INCIDENT_TYPES = ['unsafe_driving', 'harassment', 'robbery', 'assault', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];

function IncidentReportForm({ onSuccess }) {
  const [form, setForm] = useState({
    plate: '',
    driverName: '',
    platform: '',
    vehicleType: '',
    type: '',
    severity: '',
    description: '',
    area: '',
  });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
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
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Report an Incident</h2>
      <p className="text-sm text-gray-500">
        Your report will be reviewed before it appears as a safety signal to other passengers.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Plate number *</label>
        <input
          name="plate"
          value={form.plate}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Driver name (optional)</label>
        <input
          name="driverName"
          value={form.driverName}
          onChange={handleChange}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Platform *</label>
          <select
            name="platform"
            value={form.platform}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Vehicle type *</label>
          <select
            name="vehicleType"
            value={form.vehicleType}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Incident type *</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Severity *</label>
          <select
            name="severity"
            value={form.severity}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Area *</label>
        <input
          name="area"
          value={form.area}
          onChange={handleChange}
          required
          placeholder="e.g. Braamfontein, Johannesburg"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={4}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Evidence (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
          className="mt-1 w-full text-sm text-gray-600"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 text-white text-sm font-medium py-2.5 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit report'}
      </button>
    </form>
  );
}

export default IncidentReportForm;