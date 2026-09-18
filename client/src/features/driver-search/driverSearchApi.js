//handles the http request using the apis

import { api } from "../../lib/api";

export function searchByPlate(plateNumber) {
  return api.get(`/driver-search/${plateNumber}`);
}

export function checkIdentity(plateNumber, driverId) {
  return api.post("/driver-search/check-identity", { plateNumber, driverId });
}

export function searchByName(name) {
  return api.get(
    `/driver-search/search/by-name?name=${encodeURIComponent(name)}`,
  );
}
