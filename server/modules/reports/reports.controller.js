import { createIncident, getIncidentById, getIncidents, uploadEvidenceImage , addEvidenceToIncident , addCorroboration ,getCorroborations } from './reports.service.js';

async function handleCreateIncident(req, res) {
  try {
    const { plate, platform, vehicleType, type, severity, description, area } = req.body;

    // Basic validation — required fields
    if (!plate || !platform || !vehicleType || !type || !severity || !description || !area) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const incident = await createIncident({
      reporterId: req.user.uid,
      ...req.body,
    });

    res.status(201).json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleGetIncident(req, res) {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleListIncidents(req, res) {
  try {
    const { area, platform, severity, status } = req.query;
    const incidents = await getIncidents({ area, platform, severity, status });
    res.json({ success: true, count: incidents.length, incidents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleGetMyIncidents(req, res) {
  try {
    const incidents = await getIncidents({ reporterId: req.user.uid });
    res.json({ success: true, count: incidents.length, incidents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleUploadEvidence(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const evidenceUrl = await uploadEvidenceImage(req.file.buffer);
    const updatedUrls = await addEvidenceToIncident(req.params.id, evidenceUrl);

    res.json({ success: true, evidenceUrl, evidenceUrls: updatedUrls });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleAddCorroboration(req, res) {
  try {
    const corroboration = await addCorroboration(
      req.params.id,
      req.user.uid,
      req.body.note || null
    );

    if (!corroboration) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    res.status(201).json({ success: true, corroboration });
  } catch (error) {
    if (error.message === 'You cannot corroborate your own report') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
}

async function handleGetCorroborations(req, res) {
  try {
    const corroborations = await getCorroborations(req.params.id);
    res.json({ success: true, count: corroborations.length, corroborations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export { handleCreateIncident, handleGetIncident, handleListIncidents, handleGetMyIncidents, handleUploadEvidence, handleAddCorroboration, handleGetCorroborations };