import { db } from '../../config/firebase.js';
import { encryptDescriptor, decryptDescriptor } from '../../utils/biometricCrypto.js';

const REFERENCES = 'verificationReferences';
const ATTEMPTS = 'verificationAttempts';

const MATCH_DISTANCE_THRESHOLD = 0.6;
const MIN_CONFIDENCE = 0.5; // 70% minimum confidence required

function euclideanDistance(a, b) {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0)
  );
}

export async function scanPlate({ plate, descriptor, uid }) {
  const normalisedPlate = plate.toUpperCase().trim();
  const consentAt = new Date();
  const referenceRef = db.collection(REFERENCES).doc(normalisedPlate);
  const referenceSnap = await referenceRef.get();

  if (!referenceSnap.exists) {
    await referenceRef.set({
      descriptor: encryptDescriptor(descriptor),
      enrolledAt: consentAt,
      enrolledBy: uid,
    });

    await db.collection(ATTEMPTS).add({
      plate: normalisedPlate,
      result: 'no_record',
      consentGiven: true,
      consentAt,
      verifiedBy: uid,
      createdAt: consentAt,
    });

    return {
      result: 'no_record',
      message:
        'No prior verification for this plate. This scan has been saved as the reference photo for future checks.',
    };
  }

  const referenceDescriptor = decryptDescriptor(
    referenceSnap.data().descriptor
  );

  const distance = euclideanDistance(descriptor, referenceDescriptor);

  // Convert the distance into a confidence score between 0 and 1
  const confidence = Math.max(
    0,
    Math.min(1, 1 - distance / MATCH_DISTANCE_THRESHOLD)
  );

  // Only accept the driver if the confidence is at least 70%
  const isMatch = confidence >= MIN_CONFIDENCE;

  await db.collection(ATTEMPTS).add({
    plate: normalisedPlate,
    result: isMatch ? 'match' : 'mismatch',
    confidence,
    consentGiven: true,
    consentAt,
    verifiedBy: uid,
    createdAt: consentAt,
  });

  return {
    result: isMatch ? 'match' : 'mismatch',
    confidence,
    message: isMatch
      ? 'The driver matches our verification record for this plate.'
      : 'The driver does not match our verification record for this plate.',
  };
}

export async function getHistory(plate) {
  const normalisedPlate = plate.toUpperCase().trim();

  const snap = await db
    .collection(ATTEMPTS)
    .where('plate', '==', normalisedPlate)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => {
    const { result, confidence, createdAt } = doc.data();
    return { result, confidence, createdAt };
  });
}