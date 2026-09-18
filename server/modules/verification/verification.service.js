import { db } from '../../config/firebase.js';
import { decryptDescriptor } from '../../utils/biometricCrypto.js';
import { isValidPlate, normalisePlate } from '../driverSearch/driverValidation.js';

const REFERENCES = 'verificationReferences';
const ATTEMPTS = 'verificationAttempts';

const MATCH_DISTANCE_THRESHOLD = 0.6;
const MIN_CONFIDENCE = 0.7;

function euclideanDistance(a, b) {
  return Math.sqrt(
    a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0),
  );
}

function createRequestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function referenceDocumentId(vehicleId, driverId) {
  return Buffer.from(`${vehicleId}\u0000${driverId}`, 'utf8').toString('base64url');
}

async function loadRegisteredIdentity({ plate, vehicleId, driverId }) {
  const normalisedPlate = normalisePlate(plate);
  if (!isValidPlate(normalisedPlate)) {
    throw createRequestError('Enter a valid vehicle plate number.', 400);
  }

  const [vehicleSnapshot, driverSnapshot] = await Promise.all([
    db.collection('vehicles').doc(vehicleId).get(),
    db.collection('drivers').doc(driverId).get(),
  ]);

  if (!vehicleSnapshot.exists || !driverSnapshot.exists) {
    throw createRequestError('The selected driver or vehicle is no longer available.', 404);
  }

  const vehicle = { id: vehicleSnapshot.id, ...vehicleSnapshot.data() };
  const driver = { id: driverSnapshot.id, ...driverSnapshot.data() };

  if (normalisePlate(vehicle.plateNumber || '') !== normalisedPlate) {
    throw createRequestError('The selected vehicle does not match this plate number.', 409);
  }

  const vehicleListsDriver = (vehicle.driverIds || []).includes(driver.id);
  const driverListsVehicle = (driver.vehicleIds || []).includes(vehicle.id);
  if (!vehicleListsDriver || !driverListsVehicle) {
    throw createRequestError('The selected driver is not linked to this vehicle.', 409);
  }

  return { normalisedPlate, vehicle, driver };
}

async function recordAttempt({ normalisedPlate, vehicleId, driverId, result, confidence, uid }) {
  const createdAt = new Date();
  await db.collection(ATTEMPTS).add({
    plate: normalisedPlate,
    vehicleId,
    driverId,
    result,
    ...(typeof confidence === 'number' ? { confidence } : {}),
    consentGiven: true,
    consentAt: createdAt,
    verifiedBy: uid,
    createdAt,
  });
}

// A passenger scan may compare only with a biometric reference that was
// previously enrolled for this exact driver-and-vehicle relationship. It must
// never establish a new reference: an impostor could otherwise become the
// baseline simply by scanning first.
async function scanDriver({ plate, vehicleId, driverId, descriptor, uid }) {
  const { normalisedPlate, vehicle, driver } = await loadRegisteredIdentity({
    plate,
    vehicleId,
    driverId,
  });
  const referenceSnapshot = await db
    .collection(REFERENCES)
    .doc(referenceDocumentId(vehicle.id, driver.id))
    .get();

  if (!referenceSnapshot.exists) {
    await recordAttempt({
      normalisedPlate,
      vehicleId: vehicle.id,
      driverId: driver.id,
      result: 'no_record',
      uid,
    });

    return {
      result: 'no_record',
      message:
        'This driver and vehicle are registered, but no approved biometric reference is available for a face comparison.',
    };
  }

  const reference = referenceSnapshot.data();
  if (reference.vehicleId !== vehicle.id || reference.driverId !== driver.id) {
    await recordAttempt({
      normalisedPlate,
      vehicleId: vehicle.id,
      driverId: driver.id,
      result: 'no_record',
      uid,
    });

    return {
      result: 'no_record',
      message:
        'No approved biometric reference is available for this selected driver and vehicle.',
    };
  }

  const referenceDescriptor = decryptDescriptor(reference.descriptor);
  if (
    !Array.isArray(referenceDescriptor) ||
    referenceDescriptor.length !== descriptor.length ||
    !referenceDescriptor.every(Number.isFinite)
  ) {
    throw createRequestError('The registered biometric reference is invalid. Please contact support.', 500);
  }

  const distance = euclideanDistance(descriptor, referenceDescriptor);
  const confidence = Math.max(
    0,
    Math.min(1, 1 - distance / MATCH_DISTANCE_THRESHOLD),
  );
  const isMatch = confidence >= MIN_CONFIDENCE;

  await recordAttempt({
    normalisedPlate,
    vehicleId: vehicle.id,
    driverId: driver.id,
    result: isMatch ? 'match' : 'mismatch',
    confidence,
    uid,
  });

  return {
    result: isMatch ? 'match' : 'mismatch',
    confidence,
    message: isMatch
      ? 'The pickup driver matches the registered biometric reference for this vehicle.'
      : 'The pickup driver does not match the registered biometric reference for this vehicle.',
  };
}

async function getHistory(plate) {
  const normalisedPlate = normalisePlate(plate);

  const snapshot = await db
    .collection(ATTEMPTS)
    .where('plate', '==', normalisedPlate)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((document) => {
    const { result, confidence, createdAt } = document.data();
    return { result, confidence, createdAt };
  });
}

export { scanDriver, getHistory };
