import { db } from '../../config/firebase.js';

const incidentsRef = db.collection('incidents');
const usersRef = db.collection('users');

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

export async function getOverviewStats() {
    const [usersSnapshot, incidentsSnapshot, pendingSnapshot] = await Promise.all([
        usersRef.get(),
        incidentsRef.get(),
        incidentsRef.where('status', '==', 'pending').get(),
    ]);

    const totalUsers = usersSnapshot.size;
    const totalIncidents = incidentsSnapshot.size;
    const pendingCount = pendingSnapshot.size;

    const incidents = incidentsSnapshot.docs.map(doc => doc.data());
    const confirmedCount = incidents.filter(i => i.status === 'confirmed').length;

    return { totalUsers, totalIncidents, pendingCount, confirmedCount };
}

export async function listUsers() {
    const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            uid: doc.id,
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: data.createdAt,
        };
    });
}

export async function getReportDetail(incidentId) {
    const incidentDoc = await incidentsRef.doc(incidentId).get();
    if (!incidentDoc.exists) return null;

    const incident = { id: incidentDoc.id, ...incidentDoc.data() };

    // Resolve reporter name (admin-only — public API never exposes this)
    let reporter = null;
    if (incident.reporterId) {
        const userDoc = await usersRef.doc(incident.reporterId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            reporter = { uid: userDoc.id, name: userData.name, email: userData.email };
        }
    }

    // Fetch corroborations (admin sees notes + timestamps, still no corroborator identity)
    const corroborationsRef = db.collection('corroborations');
    const corrSnapshot = await corroborationsRef
        .where('incidentId', '==', incidentId)
        .orderBy('createdAt', 'desc')
        .get();
    const corroborations = corrSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, note: data.note, createdAt: data.createdAt };
    });

    return { incident, reporter, corroborations };
}