function normalisePlate(plateNumber) {
  return plateNumber.trim().toUpperCase().replace(/[\s-]/g, "");
}

export { normalisePlate };
