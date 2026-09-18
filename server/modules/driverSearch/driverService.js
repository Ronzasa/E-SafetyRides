import {
  findVehicleByPlate,
  findDriversByIds,
  findDriverById,
  linkDriverToVehicle,
  createVerification,
  findVerificationsByVehicleId,
  findDriversByName,
  findVehiclesByIds,
  findConfirmedIncidentsByDriverId,
  findConfirmedIncidentsByVehicleId,
} from "./driverRepository.js";

import { normalisePlate } from "./driverValidation.js";

// ─────────────────────────────────────────────────────
// Public incident projection
// Only confirmed incidents may leave the server through
// public search, and reporter identity must never be
// part of the payload (POPIA data minimisation).
// ─────────────────────────────────────────────────────

function toIsoString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}

function toMillis(value) {
  const iso = toIsoString(value);
  const millis = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(millis) ? 0 : millis;
}

function toPublicIncident(incident) {
  return {
    id: incident.id,
    type: incident.type,
    severity: incident.severity,
    description: incident.description,
    area: incident.area,
    platform: incident.platform,
    vehicleType: incident.vehicleType,
    evidenceUrls: incident.evidenceUrls || [],
    corroborationCount: incident.corroborationCount || 0,
    createdAt: toIsoString(incident.createdAt),
  };
}

function toPublicIncidents(incidents) {
  return [...incidents]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .map(toPublicIncident);
}

async function searchDriverByPlate(plateNumber) {
  const normalisedPlate = normalisePlate(plateNumber);

  const vehicle = await findVehicleByPlate(normalisedPlate);

  // Unknown plates are reported as NEW without creating records — vehicles
  // only enter the system once an admin confirms a report for them.
  if (!vehicle) {
    return {
      status: "NEW",
      vehicle: null,
      drivers: [],
    };
  }

  const [driverDocuments, vehicleIncidents] = await Promise.all([
    findDriversByIds(vehicle.driverIds || []),
    findConfirmedIncidentsByVehicleId(vehicle.id),
  ]);

  const drivers = await Promise.all(
    driverDocuments.map(async (driver) => ({
      ...driver,
      incidents: toPublicIncidents(
        await findConfirmedIncidentsByDriverId(driver.id),
      ),
    })),
  );

  const result = {
    status: "KNOWN",
    vehicle: {
      ...vehicle,
      incidents: toPublicIncidents(vehicleIncidents),
    },
    drivers,
  };

  if ((vehicle.driverIds || []).length > 1) {
    result.multipleDriversWarning =
      "This vehicle has been linked to more than one driver identity.";
  }

  return result;
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
      const [vehicles, incidents] = await Promise.all([
        findVehiclesByIds(driver.vehicleIds || []),
        findConfirmedIncidentsByDriverId(driver.id),
      ]);

      return {
        ...driver,
        vehicles,
        incidents: toPublicIncidents(incidents),
      };
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
