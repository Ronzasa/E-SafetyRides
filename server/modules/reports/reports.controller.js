import { createIncident, getIncidentById, getIncidents, uploadEvidenceImage, addEvidenceToIncident, addCorroboration, getCorroborations } from './reports.service.js';
import { normalisePlate, isValidReportPlate } from '../driverSearch/driverValidation.js';

// Public endpoints (GET / and GET /:id are unauthenticated) must never
// expose reporter identity — POPIA data minimisation. The reporter's own
// view (GET /mine) and the admin API keep the full document.
function toPublicIncident(incident) {
    const { reporterId, ...safe } = incident;
    return safe;
}

async function handleCreateIncident(req, res) {
    try {
        const { plate, platform, vehicleType, type, severity, description, area } = req.body;

        // Basic validation — required fields
        if (!plate || !platform || !vehicleType || !type || !severity || !description || !area) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // New report plates must be exactly 8 letters/digits (all caps after
        // normalisePlate) — the same rule the report form enforces. Driver
        // search accepts 1-8 so every plate accepted here stays searchable.
        if (typeof plate !== 'string' || !isValidReportPlate(normalisePlate(plate))) {
            return res.status(400).json({ success: false, error: 'Please enter a valid plate number (exactly 8 letters/digits, e.g. ABC123GP).' });
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
        res.json({ success: true, incident: toPublicIncident(incident) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function handleListIncidents(req, res) {
    try {
        const { area, platform, severity, status } = req.query;

        // Public listing must never expose unmoderated reports (US-16a) —
        // only allow a caller to request under_review/confirmed explicitly.
        const allowedPublicStatuses = ['under_review', 'confirmed'];
        const safeStatus = allowedPublicStatuses.includes(status) ? status : undefined;

        if (!status) {
            // No status requested — return both public-safe statuses, never pending/rejected
            const [underReview, confirmed] = await Promise.all([
                getIncidents({ area, platform, severity, status: 'under_review' }),
                getIncidents({ area, platform, severity, status: 'confirmed' }),
            ]);
            const incidents = [...underReview, ...confirmed].map(toPublicIncident);
            return res.json({ success: true, count: incidents.length, incidents });
        }

        const incidents = (await getIncidents({ area, platform, severity, status: safeStatus })).map(toPublicIncident);
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