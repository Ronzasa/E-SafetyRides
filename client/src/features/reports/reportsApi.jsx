import { api } from '../../lib/api';

async function createIncident(form) {
  try {
    const data = await api.post('/reports', form);
    return { success: true, incident: data.incident };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function uploadEvidence(incidentId, file) {
  const formData = new FormData();
  formData.append('evidence', file);
  try {
    const data = await api.upload(`/reports/${incidentId}/evidence`, formData);
    return { success: true, evidenceUrl: data.evidenceUrl, evidenceUrls: data.evidenceUrls };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getMyIncidents() {
  try {
    const data = await api.get('/reports/mine');
    return { success: true, incidents: data.incidents };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getIncident(id) {
  try {
    const data = await api.get(`/reports/${id}`, { auth: false });
    return { success: true, incident: data.incident };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function addCorroboration(id, note) {
  try {
    const data = await api.post(`/reports/${id}/corroborate`, { note });
    return { success: true, corroboration: data.corroboration };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getCorroborations(id) {
  try {
    const data = await api.get(`/reports/${id}/corroborations`, { auth: false });
    return { success: true, corroborations: data.corroborations };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getIncidents(filters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  ).toString();
  try {
    const data = await api.get(`/reports${params ? `?${params}` : ''}`, { auth: false });
    return { success: true, incidents: data.incidents };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export {
  createIncident,
  uploadEvidence,
  getMyIncidents,
  getIncidents,
  getIncident,
  addCorroboration,
  getCorroborations,
};
