import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../config/firebase.js';
import { createFirestoreDouble, installFirestoreDouble } from '../../testing/firestoreDouble.js';

// admin.service.js captures its collection references at import time, so
// the Firestore double must be installed before the module under test is
// loaded (hence the dynamic import below).
const double = installFirestoreDouble(db, createFirestoreDouble());
const { updateReportStatus } = await import('./admin.service.js');

test('updateReportStatus rejects an invalid status before touching the database', async () => {
  double.reset();
  await assert.rejects(
    () => updateReportStatus('some-id', 'not-a-real-status'),
    (err) => err.code === 'INVALID_STATUS',
  );
});

test('confirmReport links driver + vehicle, normalises the plate and counts once', async () => {
  double.reset({
    incidents: {
      'inc-with-name': {
        plate: 'abc 123 gp',
        driverName: 'John Doe',
        platform: 'uber',
        status: 'pending',
      },
    },
  });

  const result = await updateReportStatus('inc-with-name', 'confirmed');

  assert.equal(result.status, 'confirmed');
  assert.equal(result.alreadyConfirmed, false);
  assert.ok(result.driverId, 'driverId must be set');
  assert.ok(result.vehicleId, 'vehicleId must be set');

  const incident = double.read('incidents', 'inc-with-name');
  assert.equal(incident.status, 'confirmed');
  assert.equal(incident.plate, 'ABC123GP');
  assert.equal(incident.driverId, result.driverId);
  assert.equal(incident.vehicleId, result.vehicleId);
  assert.ok(incident.confirmedAt instanceof Date);

  const vehicle = double.read('vehicles', result.vehicleId);
  assert.equal(vehicle.plateNumber, 'ABC123GP');
  assert.deepEqual(vehicle.driverIds, [result.driverId]);
  assert.equal(vehicle.incidentCount, 1);

  const driver = double.read('drivers', result.driverId);
  assert.equal(driver.name, 'John Doe');
  assert.equal(driver.nameKey, 'john doe');
  assert.deepEqual(driver.vehicleIds, [result.vehicleId]);
  assert.equal(driver.incidentCount, 1);
  assert.deepEqual(driver.platforms, ['uber']);
});

test('confirming twice is idempotent — no double increments, no duplicate links', async () => {
  double.reset({
    incidents: {
      'inc-twice': { plate: 'DBL 321', driverName: 'Twice Confirmed', status: 'pending' },
    },
  });

  const first = await updateReportStatus('inc-twice', 'confirmed');
  const second = await updateReportStatus('inc-twice', 'confirmed');

  assert.equal(second.alreadyConfirmed, true);
  assert.equal(second.repaired, false);
  assert.equal(second.driverId, first.driverId);
  assert.equal(second.vehicleId, first.vehicleId);

  assert.equal(double.read('drivers', first.driverId).incidentCount, 1);
  assert.equal(double.read('vehicles', first.vehicleId).incidentCount, 1);
  assert.deepEqual(
    double.read('vehicles', first.vehicleId).driverIds,
    [first.driverId],
  );
});

test('confirming a report without a driver name attaches it to the vehicle only', async () => {
  double.reset({
    incidents: {
      'inc-no-name': { plate: 'XYZ 999', status: 'pending' },
    },
  });

  const result = await updateReportStatus('inc-no-name', 'confirmed');

  assert.equal(result.driverId, null);
  assert.ok(result.vehicleId);

  const incident = double.read('incidents', 'inc-no-name');
  assert.equal(incident.driverId, null);
  assert.equal(incident.vehicleId, result.vehicleId);

  const vehicle = double.read('vehicles', result.vehicleId);
  assert.equal(vehicle.plateNumber, 'XYZ999');
  assert.equal(vehicle.incidentCount, 1);
  assert.deepEqual(vehicle.driverIds, []);
  assert.equal(double.count('drivers'), 0, 'no driver may be invented');
});

test('re-confirming a legacy confirmation repairs its missing linkage exactly once', async () => {
  double.reset({
    incidents: {
      'inc-legacy': {
        // The pre-fix write shape: confirmed status, no linkage, no confirmedAt.
        plate: 'LEG 123 GP',
        driverName: 'Legacy Driver',
        platform: 'bolt',
        status: 'confirmed',
      },
    },
  });

  const repaired = await updateReportStatus('inc-legacy', 'confirmed');

  assert.equal(repaired.alreadyConfirmed, true);
  assert.equal(repaired.repaired, true);
  assert.ok(repaired.driverId);
  assert.ok(repaired.vehicleId);

  const incident = double.read('incidents', 'inc-legacy');
  assert.equal(incident.driverId, repaired.driverId);
  assert.equal(incident.vehicleId, repaired.vehicleId);
  assert.equal(incident.plate, 'LEG123GP');
  assert.ok(incident.confirmedAt instanceof Date);
  assert.equal(double.read('drivers', repaired.driverId).incidentCount, 1);
  assert.equal(double.read('vehicles', repaired.vehicleId).incidentCount, 1);

  const again = await updateReportStatus('inc-legacy', 'confirmed');
  assert.equal(again.repaired, false);
  assert.equal(double.read('drivers', repaired.driverId).incidentCount, 1);
  assert.equal(double.read('vehicles', repaired.vehicleId).incidentCount, 1);
});

test('a plate that fails validation never mints a vehicle record', async () => {
  double.reset({
    incidents: {
      'inc-bad-plate': { plate: 'NOT A PLATE!!', driverName: 'Someone', status: 'pending' },
    },
  });

  const result = await updateReportStatus('inc-bad-plate', 'confirmed');

  assert.equal(result.vehicleId, null);
  assert.ok(result.driverId);
  assert.equal(double.count('vehicles'), 0);
  assert.equal(double.read('incidents', 'inc-bad-plate').vehicleId, null);
});

test('confirmation adds the reported platform to the driver without duplicates', async () => {
  double.reset({
    drivers: {
      'driver-existing': {
        name: 'John Doe',
        nameKey: 'john doe',
        platforms: ['Bolt'],
        vehicleIds: [],
        incidentCount: 0,
      },
    },
    vehicles: {
      'vehicle-existing': {
        plateNumber: 'ABC123GP',
        driverIds: [],
        verificationCount: 0,
        incidentCount: 0,
      },
    },
    incidents: {
      'inc-bolt': { plate: 'ABC123GP', driverName: 'john doe', platform: 'bolt', status: 'pending' },
      'inc-uber': { plate: 'ABC123GP', driverName: 'John Doe', platform: 'Uber', status: 'pending' },
    },
  });

  await updateReportStatus('inc-bolt', 'confirmed');
  assert.deepEqual(
    double.read('drivers', 'driver-existing').platforms,
    ['Bolt'],
    'case-insensitive duplicate must not be added',
  );

  await updateReportStatus('inc-uber', 'confirmed');
  assert.deepEqual(
    double.read('drivers', 'driver-existing').platforms,
    ['Bolt', 'Uber'],
  );

  assert.equal(double.read('drivers', 'driver-existing').incidentCount, 2);
  assert.equal(double.read('vehicles', 'vehicle-existing').incidentCount, 2);
  assert.equal(double.count('drivers'), 1, 'existing driver must be reused');
  assert.equal(double.count('vehicles'), 1, 'existing vehicle must be reused');
});

test('moving a confirmed report to rejected rolls the counts back', async () => {
  double.reset({
    incidents: {
      'inc-roll': { plate: 'RB 111 GP', driverName: 'Roll Back', status: 'pending' },
    },
  });

  const confirmed = await updateReportStatus('inc-roll', 'confirmed');
  assert.equal(double.read('drivers', confirmed.driverId).incidentCount, 1);

  await updateReportStatus('inc-roll', 'rejected');

  assert.equal(double.read('incidents', 'inc-roll').status, 'rejected');
  assert.equal(double.read('drivers', confirmed.driverId).incidentCount, 0);
  assert.equal(double.read('vehicles', confirmed.vehicleId).incidentCount, 0);
});
