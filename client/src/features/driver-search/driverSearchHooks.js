import { useState } from "react";
import { searchByPlate, searchByName } from "./driverSearchApi";
import { createIncident } from "../reports/reportsApi";

const TOAST_DURATION_MS = 4000;

// Only auto-prompt when the search resolves to exactly one driver with a
// known plate — anything more ambiguous (no driver linked, several name
// matches, a driver with no linked vehicle) has nothing safe to confirm
// against, so no popup fires.
function resolveConfirmTarget(data, mode) {
  if (mode === "name") {
    if (data.status === "NO_MATCH" || data.drivers?.length !== 1) {
      return null;
    }
    const [driver] = data.drivers;
    const plate = driver.vehicles?.[0]?.plateNumber;
    if (!plate) return null;

    return {
      driverId: driver.id,
      driverName: driver.name,
      plate,
      platform: driver.platforms?.[0],
    };
  }

  // plate mode
  if (data.status !== "KNOWN" || data.drivers?.length !== 1) {
    return null;
  }
  if (!data.vehicle?.plateNumber) return null;

  const [driver] = data.drivers;
  return {
    driverId: driver.id,
    driverName: driver.name,
    plate: data.vehicle.plateNumber,
    platform: driver.platforms?.[0],
  };
}

export function useDriverSearch() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  async function search(query, mode = "plate") {
    setLoading(true);
    setError(null);
    setResult(null);
    setConfirmTarget(null);
    setToast(null);

    try {
      const data =
        mode === "name"
          ? await searchByName(query)
          : await searchByPlate(query);
      setResult({ ...data, mode });
      setConfirmTarget(resolveConfirmTarget(data, mode));
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Passenger says this is their driver — nothing to file, just reassure them.
  function confirmMatch() {
    setConfirmTarget(null);
    showToast("Enjoy your ride — stay safe out there! 🚗", "success");
  }

  // Passenger says the pickup driver doesn't match the registered one —
  // file it as an incident automatically, same endpoint a manual report
  // uses (reports.route.js requires auth, same as any passenger report),
  // so it lands in the normal admin review queue.
  async function rejectMatch() {
    const target = confirmTarget;
    if (!target) return;

    setConfirmSubmitting(true);
    try {
      const outcome = await createIncident({
        plate: target.plate,
        driverName: target.driverName,
        platform: target.platform || "other",
        // Not captured anywhere the search result can see — flagged as
        // "other" rather than guessed. Same for area below.
        vehicleType: "other",
        type: "other",
        severity: "medium",
        description: `Auto-filed from Driver Search: the pickup driver did not match the driver registered for this vehicle/profile (${target.driverName}).`,
        area: "Not specified",
      });

      if (outcome.success) {
        showToast(
          "Thanks — we've flagged this mismatch for review.",
          "warning",
        );
      } else {
        showToast(
          outcome.error || "Couldn't file the report — please try again.",
          "error",
        );
      }
    } finally {
      setConfirmSubmitting(false);
      setConfirmTarget(null);
    }
  }

  function dismissToast() {
    setToast(null);
  }

  return {
    result,
    loading,
    error,
    search,
    confirmTarget,
    confirmSubmitting,
    confirmMatch,
    rejectMatch,
    toast,
    dismissToast,
  };
}
