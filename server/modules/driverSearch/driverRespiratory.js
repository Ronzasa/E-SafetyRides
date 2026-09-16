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

export { findVehicleByPlate, createVehicle };
