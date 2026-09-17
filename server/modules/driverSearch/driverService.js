import {
  findVehicleByPlate,
  createVehicle,
  findDriversByIds,
  findDriverById,
  linkDriverToVehicle,
  createVerification,
  findVerificationsByVehicleId,
  findDriversByName,
  findVehiclesByIds,
} from "./driverRespiratory.js";

import { normalisePlate } from "./driverValidation.js";

async function searchDriverByPlate(plateNumber) {
  const normalisedPlate = normalisePlate(plateNumber);

  const vehicle = await findVehicleByPlate(normalisedPlate);

  if (vehicle) {
    const drivers = await findDriversByIds(vehicle.driverIds || []);

    const result = {
      status: "KNOWN",
      vehicle,
      drivers,
    };

    if ((vehicle.driverIds || []).length > 1) {
      result.multipleDriversWarning =
        "This vehicle has been linked to more than one driver identity.";
    }

    return result;
  }

  const newVehicle = await createVehicle({
    plateNumber: normalisedPlate,
    status: "NEW",
    driverIds: [],
    verificationCount: 0,
    incidentCount: 0,
  });

  return {
    status: "NEW",
    vehicle: newVehicle,
    drivers: [],
  };
}

async function verifyDriverVehicle(plateNumber, driverId) {
  const normalisedPlate = normalisePlate(plateNumber);

  const vehicle = await findVehicleByPlate(normalisedPlate);

  if (!vehicle) {
    const error = new Error("Vehicle not found for that plate number.");
    error.statusCode = 404;
    throw error;
  }

  const driver = await findDriverById(driverId);

  if (!driver) {
    const error = new Error("Driver not found for that driver ID.");
    error.statusCode = 404;
    throw error;
  }

  await linkDriverToVehicle(vehicle.id, driverId);

  const verification = await createVerification({
    vehicleId: vehicle.id,
    driverId,
    plateNumber: normalisedPlate,
    verifiedAt: new Date().toISOString(),
  });

  return {
    status: "VERIFIED",
    vehicleId: vehicle.id,
    driverId,
    verification,
  };
}

async function checkIdentityConsistency(plateNumber, claimedDriverId) {
  const normalisedPlate = normalisePlate(plateNumber);

  const vehicle = await findVehicleByPlate(normalisedPlate);

  if (!vehicle) {
    return {
      status: "UNKNOWN",
      reason: "This vehicle has no prior record in the system.",
      vehicle: null,
    };
  }

  const verifications = await findVerificationsByVehicleId(vehicle.id);

  if (verifications.length === 0) {
    return {
      status: "UNKNOWN",
      reason:
        "This vehicle is known, but has never been verified with any driver.",
      vehicle,
    };
  }

  const verifiedDriverIds = new Set(verifications.map((v) => v.driverId));

  if (verifiedDriverIds.has(claimedDriverId)) {
    const driver = await findDriverById(claimedDriverId);

    const result = {
      status: "MATCH",
      reason: "This driver has previously been verified with this vehicle.",
      vehicle,
      driver,
      verificationCount: verifications.filter(
        (v) => v.driverId === claimedDriverId,
      ).length,
    };

    if (driver && driver.incidentCount > 0) {
      result.warning = `This driver has ${driver.incidentCount} prior reported incident${
        driver.incidentCount > 1 ? "s" : ""
      }.`;
    }

    return result;
  }

  const previousDrivers = await findDriversByIds(Array.from(verifiedDriverIds));

  return {
    status: "MISMATCH",
    reason: "This vehicle has been verified with a different driver before.",
    vehicle,
    previousDrivers,
  };
}

async function searchDriverByName(nameQuery) {
  const drivers = await findDriversByName(nameQuery);

  if (drivers.length === 0) {
    return {
      status: "NO_MATCH",
      drivers: [],
    };
  }

  const driversWithVehicles = await Promise.all(
    drivers.map(async (driver) => {
      const vehicles = await findVehiclesByIds(driver.vehicleIds || []);
      return { ...driver, vehicles };
    }),
  );

  return {
    status: "FOUND",
    drivers: driversWithVehicles,
  };
}

export {
  searchDriverByPlate,
  verifyDriverVehicle,
  checkIdentityConsistency,
  searchDriverByName,
};
