import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../config/firebase.js';
import { createFirestoreDouble, installFirestoreDouble } from '../../testing/firestoreDouble.js';

process.env.BIOMETRIC_ENCRYPTION_KEY = '11'.repeat(32);

const double = installFirestoreDouble(db, createFirestoreDouble());
const { encryptDescriptor } = await import('../../utils/biometricCrypto.js');
const { scanDriver } = await import('./verification.service.js');

const driverId = 'driver001';
const vehicleId = 'vehicle001';
const plate = 'ABC123GP';
const matchingDescriptor = Array.from({ length: 128 }, (_, index) => index / 1000);

function referenceId() {
  return Buffer.from(`${vehicleId}\u0000${driverId}`, 'utf8').toString('base64url');
}

function reset({ reference } = {}) {
  double.reset({
    vehicles: {
      [vehicleId]: {
        plateNumber: plate,
        driverIds: [driverId],
      },
    },
    drivers: {
      [driverId]: {
        name: 'John Doe',
        vehicleIds: [vehicleId],
      },
    },
    ...(reference
      ? {
          verificationReferences: {
            [referenceId()]: {
              vehicleId,
              driverId,
              descriptor: encryptDescriptor(reference),
            },
          },
        }
      : {}),
  });
}

test('a passenger scan never creates a biometric reference for an un-enrolled driver', async () => {
  reset();

  const result = await scanDriver({
    plate: 'abc 123-gp',
    vehicleId,
    driverId,
    descriptor: matchingDescriptor,
    uid: 'passenger001',
  });

  assert.equal(result.result, 'no_record');
  assert.match(result.message, /registered/i);
  assert.equal(double.count('verificationReferences'), 0);

  const [attempt] = double.readCollection('verificationAttempts');
  assert.equal(attempt.plate, plate);
  assert.equal(attempt.vehicleId, vehicleId);
  assert.equal(attempt.driverId, driverId);
  assert.equal(attempt.result, 'no_record');
});

test('a scan matches only the biometric reference for the searched driver and vehicle', async () => {
  reset({ reference: matchingDescriptor });

  const result = await scanDriver({
    plate,
    vehicleId,
    driverId,
    descriptor: matchingDescriptor,
    uid: 'passenger001',
  });

  assert.equal(result.result, 'match');
  assert.equal(result.confidence, 1);

  const [attempt] = double.readCollection('verificationAttempts');
  assert.equal(attempt.result, 'match');
  assert.equal(attempt.vehicleId, vehicleId);
  assert.equal(attempt.driverId, driverId);
});

test('a scan rejects a driver that is not linked to the searched vehicle', async () => {
  reset({ reference: matchingDescriptor });
  double.seed('vehicles', vehicleId, {
    plateNumber: plate,
    driverIds: [],
  });

  await assert.rejects(
    scanDriver({
      plate,
      vehicleId,
      driverId,
      descriptor: matchingDescriptor,
      uid: 'passenger001',
    }),
    { message: 'The selected driver is not linked to this vehicle.', statusCode: 409 },
  );
});
