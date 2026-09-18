import { db } from '../../config/firebase.js';
import cloudinary from '../../config/cloudinary.js';
import { FieldValue } from 'firebase-admin/firestore';
import { normalisePlate } from '../driverSearch/driverValidation.js';

const incidentsRef = db.collection('incidents');
const corroborationsRef = db.collection('corroborations');

async function createIncident(data) {
  const now = new Date();
  const incident = {
    reporterId: data.reporterId,
    // Stored in the same canonical form driver search uses, so a confirmed
    // report always matches the vehicle record created for it.
    plate: normalisePlate(data.plate),
    driverName: data.driverName?.trim() || null,
    platform: data.platform,
    vehicleType: data.vehicleType,
    type: data.type,
    severity: data.severity,
    description: data.description,
    area: data.area,
    location: data.location || null,
    evidenceUrls: [],
    status: 'pending',
    corroborationCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await incidentsRef.add(incident);
  return { id: docRef.id, ...incident };
}

async function getIncidentById(id) {
  const doc = await incidentsRef.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function getIncidents(filters = {}) {
  let query = incidentsRef;

  if (filters.area) query = query.where('area', '==', filters.area);
  if (filters.platform) query = query.where('platform', '==', filters.platform);
  if (filters.severity) query = query.where('severity', '==', filters.severity);
  if (filters.status) query = query.where('status', '==', filters.status);
  if (filters.reporterId) query = query.where('reporterId', '==', filters.reporterId);

  const snapshot = await query.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function uploadEvidenceImage(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'e-safetyrides-evidence' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
}

async function addEvidenceToIncident(incidentId, evidenceUrl) {
  const docRef = incidentsRef.doc(incidentId);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const current = doc.data().evidenceUrls || [];
  const updated = [...current, evidenceUrl];

  await docRef.update({ evidenceUrls: updated, updatedAt: new Date() });
  return updated;
}

async function addCorroboration(incidentId, corroboratorId, note = null) {
  const incidentDoc = await incidentsRef.doc(incidentId).get();
  if (!incidentDoc.exists) return null;

  // Prevent someone corroborating their own report
  if (incidentDoc.data().reporterId === corroboratorId) {
    throw new Error('You cannot corroborate your own report');
  }

  const corroboration = {
    incidentId,
    corroboratorId,
    note,
    createdAt: new Date(),
  };

  const docRef = await corroborationsRef.add(corroboration);

  // Safely increment the count on the incident (avoids race conditions vs read-then-write)
  await incidentsRef.doc(incidentId).update({
    corroborationCount: FieldValue.increment(1),
    updatedAt: new Date(),
  });

  return { id: docRef.id, ...corroboration };
}

async function getCorroborations(incidentId) {
  const snapshot = await corroborationsRef
    .where('incidentId', '==', incidentId)
    .orderBy('createdAt', 'desc')
    .get();

  // Only return note + timestamp — never corroboratorId, to protect identity (US-13)
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return { id: doc.id, note: data.note, createdAt: data.createdAt };
  });
}

export { createIncident, getIncidentById, getIncidents, uploadEvidenceImage, addEvidenceToIncident, addCorroboration, getCorroborations };