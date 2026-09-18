import { db } from "../../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

// =====================================================
// Vehicles
// =====================================================

async function findVehicleByPlate(plateNumber) {
  const snapshot = await db
    .collection("vehicles")
    .where("plateNumber", "==", plateNumber)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    id: document.id,
    ...document.data(),
  };
}

async function findVehiclesByIds(vehicleIds) {
  const vehicles = [];

  for (const vehicleId of vehicleIds) {
    const document = await db.collection("vehicles").doc(vehicleId).get();

    if (document.exists) {
      vehicles.push({ id: document.id, ...document.data() });
    }
  }

  return vehicles;
}

async function createVehicle(vehicleData) {
  const documentReference = await db.collection("vehicles").add(vehicleData);

  return {
    id: documentReference.id,
    ...vehicleData,
  };
}

async function incrementVehicleIncidentCount(vehicleId, delta = 1) {
  await db.collection("vehicles").doc(vehicleId).update({
    incidentCount: FieldValue.increment(delta),
  });
}

// =====================================================
// Drivers
// =====================================================

async function findDriverById(driverId) {
  const document = await db.collection("drivers").doc(driverId).get();

  if (!document.exists) {
    return null;
  }

  return {
    id: document.id,
    ...document.data(),
  };
}

async function findDriversByIds(driverIds) {
  const drivers = [];

  for (const driverId of driverIds) {
    const document = await db.collection("drivers").doc(driverId).get();

    if (document.exists) {
      drivers.push({
        id: document.id,
        ...document.data(),
      });
    }
  }

  return drivers;
}

// Match a driver by the stable lowercase name key stored on the record.
async function findDriverByNameKey(nameKey) {
  const snapshot = await db
    .collection("drivers")
    .where("nameKey", "==", nameKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    id: document.id,
    ...document.data(),
  };
}

async function findDriversByName(nameQuery) {
  const searchTerm = nameQuery.trim().toLowerCase();

  const snapshot = await db.collection("drivers").get();

  const matches = [];
  snapshot.forEach((document) => {
    const data = document.data();
    if (data.name && data.name.toLowerCase().includes(searchTerm)) {
      matches.push({ id: document.id, ...data });
    }
  });

  return matches;
}

async function createDriver(driverData) {
  const documentReference = await db.collection("drivers").add(driverData);

  return {
    id: documentReference.id,
    ...driverData,
  };
}

async function incrementDriverIncidentCount(driverId, delta = 1) {
  await db.collection("drivers").doc(driverId).update({
    incidentCount: FieldValue.increment(delta),
  });
}

// =====================================================
// Driver <-> vehicle links
// =====================================================

// Verified pairing: links both sides and counts the verification, so the
// vehicle profile can show how often it has been verified.
async function linkDriverToVehicle(vehicleId, driverId) {
  const vehicleRef = db.collection("vehicles").doc(vehicleId);
  const driverRef = db.collection("drivers").doc(driverId);

  await db.runTransaction(async (transaction) => {
    const vehicleDoc = await transaction.get(vehicleRef);
    const driverDoc = await transaction.get(driverRef);

    if (!vehicleDoc.exists) {
      throw new Error("Vehicle not found.");
    }
    if (!driverDoc.exists) {
      throw new Error("Driver not found.");
    }

    const vehicleData = vehicleDoc.data();
    const driverData = driverDoc.data();

    const vehicleDriverIds = new Set(vehicleData.driverIds || []);
    vehicleDriverIds.add(driverId);

    const driverVehicleIds = new Set(driverData.vehicleIds || []);
    driverVehicleIds.add(vehicleId);

    transaction.update(vehicleRef, {
      driverIds: Array.from(vehicleDriverIds),
      verificationCount: (vehicleData.verificationCount || 0) + 1,
    });

    transaction.update(driverRef, {
      vehicleIds: Array.from(driverVehicleIds),
    });
  });
}

// Idempotent link used when an admin confirms a report: links both sides
// only if the pair is not already linked and never touches verification
// counts, so confirming the same report twice cannot duplicate links.
async function linkDriverVehiclePair(vehicleId, driverId) {
  const vehicleRef = db.collection("vehicles").doc(vehicleId);
  const driverRef = db.collection("drivers").doc(driverId);

  await db.runTransaction(async (transaction) => {
    const vehicleDoc = await transaction.get(vehicleRef);
    const driverDoc = await transaction.get(driverRef);

    if (!vehicleDoc.exists) {
      throw new Error("Vehicle not found.");
    }
    if (!driverDoc.exists) {
      throw new Error("Driver not found.");
    }

    const vehicleData = vehicleDoc.data();
    const driverData = driverDoc.data();

    const vehicleDriverIds = new Set(vehicleData.driverIds || []);
    const driverVehicleIds = new Set(driverData.vehicleIds || []);

    if (vehicleDriverIds.has(driverId) && driverVehicleIds.has(vehicleId)) {
      return; // already linked — nothing to do
    }

    vehicleDriverIds.add(driverId);
    driverVehicleIds.add(vehicleId);

    transaction.update(vehicleRef, {
      driverIds: Array.from(vehicleDriverIds),
    });

    transaction.update(driverRef, {
      vehicleIds: Array.from(driverVehicleIds),
    });
  });
}

// =====================================================
// Incidents — public safety history reads
// =====================================================

async function findConfirmedIncidentsByDriverId(driverId) {
  const snapshot = await db
    .collection("incidents")
    .where("driverId", "==", driverId)
    .where("status", "==", "confirmed")
    .get();

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

async function findConfirmedIncidentsByVehicleId(vehicleId) {
  const snapshot = await db
    .collection("incidents")
    .where("vehicleId", "==", vehicleId)
    .where("status", "==", "confirmed")
    .get();

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

// Atomic admin confirmation write: flips the report to "confirmed", attaches
// it to the resolved driver/vehicle and increments their incident counts —
// exactly once. Re-checks the status inside the transaction so a duplicate
// confirmation cannot double-increment. Returns true when it wrote.
async function markIncidentConfirmed(
  incidentId,
  { driverId = null, vehicleId = null, plate = null } = {},
) {
  const incidentRef = db.collection("incidents").doc(incidentId);

  return db.runTransaction(async (transaction) => {
    const incidentDoc = await transaction.get(incidentRef);

    if (!incidentDoc.exists) {
      return false;
    }

    if (incidentDoc.data().status === "confirmed") {
      return false; // already processed — never increment again
    }

    const update = {
      status: "confirmed",
      driverId,
      vehicleId,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    };

    if (plate) {
      update.plate = plate;
    }

    transaction.update(incidentRef, update);

    if (driverId) {
      transaction.update(db.collection("drivers").doc(driverId), {
        incidentCount: FieldValue.increment(1),
      });
    }

    if (vehicleId) {
      transaction.update(db.collection("vehicles").doc(vehicleId), {
        incidentCount: FieldValue.increment(1),
      });
    }

    return true;
  });
}

// =====================================================
// Verifications
// =====================================================

async function createVerification(verificationData) {
  const documentReference = await db
    .collection("verificationChecks")
    .add(verificationData);

  return {
    id: documentReference.id,
    ...verificationData,
  };
}

async function findVerificationsByVehicleId(vehicleId) {
  const snapshot = await db
    .collection("verificationChecks")
    .where("vehicleId", "==", vehicleId)
    .orderBy("verifiedAt", "desc")
    .get();

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export {
  findVehicleByPlate,
  findVehiclesByIds,
  createVehicle,
  incrementVehicleIncidentCount,
  findDriverById,
  findDriversByIds,
  findDriverByNameKey,
  findDriversByName,
  createDriver,
  incrementDriverIncidentCount,
  linkDriverToVehicle,
  linkDriverVehiclePair,
  findConfirmedIncidentsByDriverId,
  findConfirmedIncidentsByVehicleId,
  markIncidentConfirmed,
  createVerification,
  findVerificationsByVehicleId,
};
