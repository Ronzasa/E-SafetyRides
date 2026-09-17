import { findVehicleByPlate, createVehicle } from "./driverRespiratory.js";
import { normalisePlate } from "./driverValidation.js";

async function searchDriverByPlate(plateNumber) {
  const normalisedPlate = normalisePlate(plateNumber);

  const vehicle = await findVehicleByPlate(normalisedPlate);

  if (vehicle) {
    return { status: "KNOWN", vehicle };
  }

  const newVehicle = await createVehicle({
    plateNumber: normalisedPlate,
    status: "NEW",
    driverIds: [],
    verificationCount: 0,
    incidentCount: 0,
  });

  return { status: "NEW", vehicle: newVehicle };
}

export { searchDriverByPlate };
