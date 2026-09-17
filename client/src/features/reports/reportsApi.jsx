import { apiGet, apiPost, apiUpload } from '../../lib/apiClient';

async function createIncident(form) {
  try {
    const data = await apiPost('/reports', form, { auth: true });
    return { success: true, incident: data.incident };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function uploadEvidence(incidentId, file) {
  const formData = new FormData();
  formData.append('evidence', file);
  try {
    const data = await apiUpload(`/reports/${incidentId}/evidence`, formData);
    return { success: true, evidenceUrl: data.evidenceUrl, evidenceUrls: data.evidenceUrls };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getMyIncidents() {
  try {
    const data = await apiGet('/reports/mine', { auth: true });
    return { success: true, incidents: data.incidents };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getIncident(id) {
  try {
    const data = await apiGet(`/reports/${id}`);
    return { success: true, incident: data.incident };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function addCorroboration(id, note) {
  try {
    const data = await apiPost(`/reports/${id}/corroborate`, { note }, { auth: true });
    return { success: true, corroboration: data.corroboration };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getCorroborations(id) {
  try {
    const data = await apiGet(`/reports/${id}/corroborations`);
    return { success: true, corroborations: data.corroborations };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export {
  createIncident,
  uploadEvidence,
  getMyIncidents,
  getIncident,
  addCorroboration,
  getCorroborations,
};