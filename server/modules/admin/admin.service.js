import { db } from '../../config/firebase.js';

const incidentsRef = db.collection('incidents');

const VALID_STATUSES = ['pending', 'under_review', 'confirmed', 'rejected'];

export async function getReviewQueue(status = 'pending') {
    const snapshot = await incidentsRef
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateReportStatus(incidentId, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
        const err = new Error(`Invalid status: ${newStatus}`);
        err.code = 'INVALID_STATUS';
        throw err;
    }

    const docRef = incidentsRef.doc(incidentId);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    await docRef.update({ status: newStatus, updatedAt: new Date() });
    return { id: incidentId, status: newStatus };
}

export async function getTrends({ area, platform, severity } = {}) {
    let query = incidentsRef;

    if (area) query = query.where('area', '==', area);
    if (platform) query = query.where('platform', '==', platform);
    if (severity) query = query.where('severity', '==', severity);

    const snapshot = await query.get();
    const incidents = snapshot.docs.map(doc => doc.data());

    const byStatus = {};
    const byArea = {};
    const byPlatform = {};
    const bySeverity = {};

    for (const incident of incidents) {
        byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
        byArea[incident.area] = (byArea[incident.area] || 0) + 1;
        byPlatform[incident.platform] = (byPlatform[incident.platform] || 0) + 1;
        bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    }

    return {
        total: incidents.length,
        byStatus,
        byArea,
        byPlatform,
        bySeverity,
    };
}