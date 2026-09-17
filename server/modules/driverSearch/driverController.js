import {
  searchDriverByPlate,
  verifyDriverVehicle,
  checkIdentityConsistency,
} from "./driverService.js";

async function searchDriver(req, res) {
  try {
    const { plateNumber } = req.params;

    if (!plateNumber) {
      return res.status(400).json({ message: "Plate number is required." });
    }

    const result = await searchDriverByPlate(plateNumber);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Driver search error:", error);
    return res.status(500).json({ message: "Unable to search for driver." });
  }
}

async function verifyDriver(req, res) {
  try {
    const { plateNumber, driverId } = req.body;

    if (!plateNumber || !driverId) {
      return res
        .status(400)
        .json({ message: "plateNumber and driverId are both required." });
    }

    const result = await verifyDriverVehicle(plateNumber, driverId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Driver verification error:", error);
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || "Unable to verify driver." });
  }
}

async function checkIdentity(req, res) {
  try {
    const { plateNumber, driverId } = req.body;

    if (!plateNumber || !driverId) {
      return res
        .status(400)
        .json({ message: "plateNumber and driverId are both required." });
    }

    const result = await checkIdentityConsistency(plateNumber, driverId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Identity check error:", error);
    return res.status(500).json({ message: "Unable to check identity." });
  }
}

export { searchDriver, verifyDriver, checkIdentity };
