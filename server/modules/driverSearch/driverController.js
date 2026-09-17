import { searchDriverByPlate } from "./driverService.js";

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

export { searchDriver };
