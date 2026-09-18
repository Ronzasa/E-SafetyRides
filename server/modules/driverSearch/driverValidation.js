function normalisePlate(plateNumber) {
  return plateNumber.trim().toUpperCase().replace(/[\s-]/g, "");
}

// Stable lowercase key used to match a reported driver name to a driver
// record (e.g. "John  Doe " -> "john doe").
function normaliseNameKey(driverName) {
  return driverName.trim().toLowerCase().replace(/\s+/g, " ");
}

function isValidPlate(plateNumber) {
  return /^[A-Z0-9]{1,8}$/.test(plateNumber);
}

function isValidNameQuery(nameQuery) {
  return /^[A-Za-z\s'-]{1,50}$/.test(nameQuery.trim());
}

export { normalisePlate, normaliseNameKey, isValidPlate, isValidNameQuery };
