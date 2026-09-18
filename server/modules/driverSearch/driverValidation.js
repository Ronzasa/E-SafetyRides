function normalisePlate(plateNumber) {
  return plateNumber.trim().toUpperCase().replace(/[\s-]/g, "");
}

function isValidPlate(plateNumber) {
  return /^[A-Z0-9]{1,8}$/.test(plateNumber);
}

function isValidNameQuery(nameQuery) {
  return /^[A-Za-z\s'-]{1,50}$/.test(nameQuery.trim());
}

export { normalisePlate, isValidPlate, isValidNameQuery };
