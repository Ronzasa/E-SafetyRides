import { db } from '../../config/firebase.js';
import {
  encryptDescriptor,
  decryptDescriptor,
} from '../../utils/biometricCrypto.js';
import {
  isValidPlate,
  normalisePlate,
} from '../driverSearch/driverValidation.js';

const REFERENCES = 'verificationReferences';
const ATTEMPTS = 'verificationAttempts';

const MATCH_DISTANCE_THRESHOLD = 0.6;
const MIN_CONFIDENCE = 0.5;

function euclideanDistance(a, b) {
  return Math.sqrt(
    a.reduce(
      (sum, value, index) => sum + (value - b[index]) ** 2,
      0,
    ),
  );
}

function createRequestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function referenceDocumentId(plate) {
  return Buffer.from(plate, 'utf8').toString('base64url');
}

async function recordAttempt({
  normalisedPlate,
  result,
  confidence,
  uid,
}) {
  const createdAt = new Date();

  await db.collection(ATTEMPTS).add({
    plate: normalisedPlate,
    result,
    ...(typeof confidence === 'number' ? { confidence } : {}),
    consentGiven: true,
    consentAt: createdAt,
    verifiedBy: uid,
    createdAt,
  });
}

async function scanDriver({
  plate,
  descriptor,
  uid,
}) {
  const normalisedPlate = normalisePlate(plate);

  if (!isValidPlate(normalisedPlate)) {
    throw createRequestError(
      'Enter a valid vehicle plate number.',
      400,
    );
  }

  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== 128 ||
    !descriptor.every(Number.isFinite)
  ) {
    throw createRequestError(
      'The face descriptor is invalid.',
      400,
    );
  }

  const referenceRef = db
    .collection(REFERENCES)
    .doc(referenceDocumentId(normalisedPlate));

  const referenceSnapshot = await referenceRef.get();

  /*
   * First scan:
   * Create an encrypted biometric reference for this plate.
   */
  if (!referenceSnapshot.exists) {
    const encryptedDescriptor = encryptDescriptor(descriptor);

    await referenceRef.set({
      plate: normalisedPlate,
      descriptor: encryptedDescriptor,
      createdBy: uid,
      createdAt: new Date(),
    });

    await recordAttempt({
      normalisedPlate,
      result: 'no_record',
      uid,
    });

    return {
      result: 'no_record',
      message:
        'No previous biometric reference existed. This scan has been saved as the reference for this vehicle.',
    };
  }

  /*
   * Future scans:
   * Compare the captured face against the stored reference.
   */
  const reference = referenceSnapshot.data();

  const referenceDescriptor = decryptDescriptor(
    reference.descriptor,
  );

  if (
    !Array.isArray(referenceDescriptor) ||
    referenceDescriptor.length !== 128 ||
    !referenceDescriptor.every(Number.isFinite)
  ) {
    throw createRequestError(
      'The registered biometric reference is invalid. Please contact support.',
      500,
    );
  }

  const distance = euclideanDistance(
    descriptor,
    referenceDescriptor,
  );

  const confidence = Math.max(
    0,
    Math.min(
      1,
      1 - distance / MATCH_DISTANCE_THRESHOLD,
    ),
  );

  const isMatch = confidence >= MIN_CONFIDENCE;

  await recordAttempt({
    normalisedPlate,
    result: isMatch ? 'match' : 'mismatch',
    confidence,
    uid,
  });

  return {
    result: isMatch ? 'match' : 'mismatch',
    confidence,
    message: isMatch
      ? 'The captured face matches the stored biometric reference for this vehicle.'
      : 'The captured face does not match the stored biometric reference for this vehicle.',
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
    const {
      result,
      confidence,
      createdAt,
    } = document.data();

    return {
      result,
      confidence,
      createdAt,
    };
  });
}

export { scanDriver, getHistory };