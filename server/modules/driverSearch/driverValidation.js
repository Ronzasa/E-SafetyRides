function normalisePlate(plateNumber) {
  return plateNumber.trim().toUpperCase().replace(/[\s-]/g, "");
}

// Stable lowercase key used to match a reported driver name to a driver
// record (e.g. "John  Doe " -> "john doe").
function normaliseNameKey(driverName) {
  return driverName.trim().toLowerCase().replace(/\s+/g, " ");
}

// Rule used by driver search and vehicle linkage: 1-8 letters/digits after
// normalisation (SA plates are 8 characters; the range keeps any shorter
// legacy values findable).
function isValidPlate(plateNumber) {
  return /^[A-Z0-9]{1,8}$/.test(plateNumber);
}

// New report submissions must be exactly 8 characters (letters/digits after
// normalisation) — enforced by the report form and again here on the API.
const REPORT_PLATE_LENGTH = 8;

function isValidReportPlate(plateNumber) {
  return /^[A-Z0-9]{8}$/.test(plateNumber);
}

function isValidNameQuery(nameQuery) {
  return /^[A-Za-z\s'-]{1,50}$/.test(nameQuery.trim());
}

export { normalisePlate, normaliseNameKey, isValidPlate, isValidNameQuery, isValidReportPlate, REPORT_PLATE_LENGTH };
