import { db } from "../../config/firebase.js";

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

async function createVehicle(vehicleData) {
  const documentReference = await db.collection("vehicles").add(vehicleData);

  return {
    id: documentReference.id,
    ...vehicleData,
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
  createVehicle,
  findDriversByIds,
  findDriverById,
  linkDriverToVehicle,
  createVerification,
  findVerificationsByVehicleId,
};
