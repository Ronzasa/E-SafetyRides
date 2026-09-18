import { db } from '../../config/firebase.js';
import { normalisePlate, normaliseNameKey } from '../driverSearch/driverValidation.js';
import {
    findVehicleByPlate,
    createVehicle,
    findDriverByNameKey,
    createDriver,
    linkDriverVehiclePair,
    markIncidentConfirmed,
    incrementDriverIncidentCount,
    incrementVehicleIncidentCount,
} from '../driverSearch/driverRepository.js';

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

    // Confirmation is the only transition with side effects — it must run
    // the driver/vehicle linkage exactly once, so it gets its own path.
    if (newStatus === 'confirmed') {
        return confirmReport(incidentId);
    }

    return setReportStatus(incidentId, newStatus);
}

// Plain status transitions (pending / under_review / rejected). Moving a
// previously confirmed report away from 'confirmed' rolls back its effect
// on the public safety profile so incident counts stay accurate.
async function setReportStatus(incidentId, newStatus) {
    const docRef = incidentsRef.doc(incidentId);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const incident = doc.data();

    if (incident.status === 'confirmed') {
        await rollbackConfirmation(incident);
    }

    await docRef.update({ status: newStatus, updatedAt: new Date() });
    return { id: incidentId, status: newStatus };
}

// Undo the public-profile effects of a confirmation (paired with every
// confirmed -> non-confirmed transition so counts cannot drift).
async function rollbackConfirmation(incident) {
    const work = [];

    if (incident.driverId) {
        work.push(incrementDriverIncidentCount(incident.driverId, -1));
    }
    if (incident.vehicleId) {
        work.push(incrementVehicleIncidentCount(incident.vehicleId, -1));
    }

    await Promise.all(work);
}

// Admin confirmation: find-or-create the vehicle and driver, link them,
// attach the incident to both and increment their incident counts exactly
// once. Safe against duplicate confirmation — an already confirmed report
// returns immediately without touching counts or links.
//
// Handles reports where the driver name is missing (vehicle only),
// where the vehicle is missing (driver only), and multiple drivers
// linked to one vehicle.
async function confirmReport(incidentId) {
    const docRef = incidentsRef.doc(incidentId);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const incident = doc.data();

    if (incident.status === 'confirmed') {
        return {
            id: incidentId,
            status: 'confirmed',
            driverId: incident.driverId || null,
            vehicleId: incident.vehicleId || null,
            alreadyConfirmed: true,
        };
    }

    // 1. Vehicle — normalise the reported plate, then find or create.
    const plate = incident.plate ? normalisePlate(incident.plate) : null;
    let vehicle = null;
    if (plate) {
        vehicle = await findVehicleByPlate(plate);
        if (!vehicle) {
            vehicle = await createVehicle({
                plateNumber: plate,
                status: 'KNOWN',
                driverIds: [],
                verificationCount: 0,
                incidentCount: 0,
                createdAt: new Date(),
            });
        }
    }

    // 2. Driver — only when the report names one (missing names are
    //    handled safely: the incident is still attached to the vehicle).
    const driverName = (incident.driverName || '').trim();
    let driver = null;
    if (driverName) {
        const nameKey = normaliseNameKey(driverName);
        driver = await findDriverByNameKey(nameKey);
        if (!driver) {
            driver = await createDriver({
                name: driverName,
                nameKey,
                incidentCount: 0,
                vehicleIds: [],
                platforms: [],
                createdAt: new Date(),
            });
        }
    }

    // 3. Link driver <-> vehicle (idempotent — never duplicates links).
    if (driver && vehicle) {
        await linkDriverVehiclePair(vehicle.id, driver.id);
    }

    // 4. Flip the report to confirmed and increment counts exactly once.
    //    The transaction re-checks the status, so a duplicate confirmation
    //    that raced past the check above cannot double-increment.
    const confirmedNow = await markIncidentConfirmed(incidentId, {
        driverId: driver ? driver.id : null,
        vehicleId: vehicle ? vehicle.id : null,
        plate,
    });

    return {
        id: incidentId,
        status: 'confirmed',
        driverId: driver ? driver.id : null,
        vehicleId: vehicle ? vehicle.id : null,
        alreadyConfirmed: !confirmedNow,
    };
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