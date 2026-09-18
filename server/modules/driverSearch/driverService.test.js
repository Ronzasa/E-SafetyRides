import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../config/firebase.js';
import { createFirestoreDouble, installFirestoreDouble } from '../../testing/firestoreDouble.js';

// Install the double before the module under test loads, so the repository
// helpers talk to the in-memory store instead of live Firestore.
const double = installFirestoreDouble(db, createFirestoreDouble({
  vehicles: {
    vehicle001: {
      plateNumber: 'ABC123GP',
      driverIds: ['driver001', 'driver002'],
      verificationCount: 2,
      incidentCount: 2,
    },
  },
  drivers: {
    driver001: {
      name: 'John Doe',
      nameKey: 'john doe',
      platforms: ['Bolt'],
      vehicleIds: ['vehicle001'],
      incidentCount: 0,
    },
    driver002: {
      name: 'Peter Smith',
      nameKey: 'peter smith',
      platforms: ['Bolt'],
      vehicleIds: ['vehicle001'],
      incidentCount: 1,
    },
  },
  incidents: {
    'inc-peter': {
      driverId: 'driver002',
      vehicleId: 'vehicle001',
      status: 'confirmed',
      type: 'robbery',
      severity: 'medium',
      area: 'East End, Rustenburg',
      reporterId: 'user-9',
      createdAt: new Date('2026-09-18T12:00:00Z'),
    },
    'inc-vehicle-only': {
      driverId: null,
      vehicleId: 'vehicle001',
      status: 'confirmed',
      type: 'unsafe_driving',
      severity: 'high',
      area: 'East End, Rustenburg',
      reporterId: 'user-8',
      createdAt: new Date('2026-09-18T11:00:00Z'),
    },
    'inc-pending': {
      driverId: 'driver002',
      vehicleId: 'vehicle001',
      status: 'pending',
      type: 'assault',
      severity: 'low',
      reporterId: 'user-7',
      createdAt: new Date('2026-09-18T13:00:00Z'),
    },
    'inc-rejected': {
      driverId: 'driver001',
      vehicleId: 'vehicle001',
      status: 'rejected',
      type: 'other',
      severity: 'low',
      reporterId: 'user-6',
      createdAt: new Date('2026-09-18T14:00:00Z'),
    },
  },
}));

const { searchDriverByPlate, searchDriverByName } = await import('./driverService.js');

test('plate search returns the vehicle, its drivers and confirmed incidents only', async () => {
  const result = await searchDriverByPlate('abc 123 gp');

  assert.equal(result.status, 'KNOWN');
  assert.equal(result.vehicle.plateNumber, 'ABC123GP');

  // Both confirmed incidents belong to the vehicle; pending/rejected never do.
  const vehicleIncidentIds = result.vehicle.incidents.map((incident) => incident.id).sort();
  assert.deepEqual(vehicleIncidentIds, ['inc-peter', 'inc-vehicle-only']);

  const peter = result.drivers.find((driver) => driver.id === 'driver002');
  assert.equal(peter.incidents.length, 1);
  assert.equal(peter.incidents[0].id, 'inc-peter');

  const john = result.drivers.find((driver) => driver.id === 'driver001');
  assert.equal(john.incidents.length, 0, 'driver-linked lookup must not leak vehicle-only incidents');

  // Multiple drivers on one plate are flagged.
  assert.ok(result.multipleDriversWarning);
});

test('plate search never exposes reporter identity', async () => {
  const result = await searchDriverByPlate('ABC123GP');

  const incidents = [
    ...result.vehicle.incidents,
    ...result.drivers.flatMap((driver) => driver.incidents),
  ];

  assert.ok(incidents.length > 0);
  for (const incident of incidents) {
    assert.ok(!('reporterId' in incident), 'reporterId must never be public');
    assert.ok(!('status' in incident), 'moderation status is not part of the public projection');
  }
});

test('plate search reports NEW plates without creating any records', async () => {
  const before = double.count('vehicles') + double.count('drivers') + double.count('incidents');

  const result = await searchDriverByPlate('ZZZ 999');

  assert.equal(result.status, 'NEW');
  assert.equal(result.vehicle, null);
  assert.deepEqual(result.drivers, []);

  const after = double.count('vehicles') + double.count('drivers') + double.count('incidents');
  assert.equal(after, before, 'search must be read-only');
});

test('name search finds drivers by substring, case-insensitively', async () => {
  const result = await searchDriverByName('PETER');

  assert.equal(result.status, 'FOUND');
  assert.equal(result.drivers.length, 1);

  const peter = result.drivers[0];
  assert.equal(peter.name, 'Peter Smith');
  assert.equal(peter.vehicleIds[0], 'vehicle001');
  assert.equal(peter.vehicles.length, 1);
  assert.equal(peter.vehicles[0].plateNumber, 'ABC123GP');
  assert.equal(peter.incidents.length, 1);
  assert.equal(peter.incidents[0].id, 'inc-peter');
  assert.ok(!('reporterId' in peter.incidents[0]));
});

test('name search does not invent drivers for vehicle-only incidents', async () => {
  const result = await searchDriverByName('nobody with this name');

  assert.equal(result.status, 'NO_MATCH');
  assert.deepEqual(result.drivers, []);
});
