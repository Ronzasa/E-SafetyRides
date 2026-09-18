import { WarningBanner } from "./warningBanner";
import { SafetySummary } from "./SafetySummary";

function formatVehicleLine(vehicle) {
  if (!vehicle) return "Unknown vehicle";

  return [vehicle.make, vehicle.colour, vehicle.plateNumber]
    .filter(Boolean)
    .join(" · ");
}

// A driver card must never read "clean" while the vehicle it is linked to
// carries confirmed incidents (for example a report that named no driver).
// Sum the linked vehicles' incident counts and point the reader to where
// the details are, so "no incidents against this driver" is unambiguous.
function vehicleIncidentNote(vehicles = []) {
  const total = vehicles.reduce(
    (sum, vehicle) => sum + (vehicle.incidentCount || 0),
    0,
  );

  if (total === 0) return null;

  const holder =
    vehicles.length > 1 ? "Linked vehicles have" : "The linked vehicle has";

  return `${holder} ${total} confirmed incident${
    total === 1 ? "" : "s"
  } — check the plate number for details.`;
}

export function DriverResultCard({ result }) {
  if (!result) return null;

  // Name search results
  if (result.mode === "name") {
    if (result.status === "NO_MATCH") {
      return (
        <div className="result-card result-unknown">
          <p>No drivers found matching that name.</p>
        </div>
      );
    }

    return (
      <div className="result-card result-known">
        <h2 className="profile-heading">Search Results</h2>
        {result.drivers.map((driver) => (
          <div key={driver.id} className="driver-info name-result-item">
            <img
              src={driver.photoUrl || "/default-avatar.png"}
              alt={driver.name}
              className="driver-photo"
              onError={(e) => {
                e.target.src = "/default-avatar.png";
              }}
            />
            <h3>{driver.name}</h3>
            {driver.platforms?.length > 0 && (
              <p className="platform-tag">
                Platform: {driver.platforms.join(", ")}
              </p>
            )}
            {driver.vehicles?.length > 0 ? (
              <p>
                Vehicle(s):{" "}
                {driver.vehicles
                  .map((vehicle) => formatVehicleLine(vehicle))
                  .join(", ")}
              </p>
            ) : (
              <p>No vehicle currently linked.</p>
            )}
            <SafetySummary
              incidents={driver.incidents}
              subject="driver"
              contextNote={vehicleIncidentNote(driver.vehicles)}
            />
          </div>
        ))}
      </div>
    );
  }

  // Plate search results
  if (result.status === "NEW") {
    return (
      <div className="result-card result-new">
        <p>This vehicle isn't in our system yet.</p>
        <p>No driver history available — proceed with caution.</p>
      </div>
    );
  }

  const vehicleIncidents = result.vehicle?.incidents || [];

  if (!result.drivers || result.drivers.length === 0) {
    return (
      <div className="result-card result-known">
        <h2 className="profile-heading">Vehicle Safety Profile</h2>
        <p className="vehicle-summary">
          Vehicle: {formatVehicleLine(result.vehicle)}
        </p>
        <p>No driver is currently linked to this vehicle.</p>
        <SafetySummary incidents={vehicleIncidents} subject="vehicle" />
      </div>
    );
  }

  return (
    <div className="result-card result-known">
      <h2 className="profile-heading">Driver Safety Profile</h2>

      {result.multipleDriversWarning && (
        <WarningBanner message={result.multipleDriversWarning} />
      )}

      <p className="vehicle-summary">
        Vehicle: {formatVehicleLine(result.vehicle)}
      </p>

      <p className="verification-count">
        Vehicle verified {result.vehicle.verificationCount || 0} time
        {(result.vehicle.verificationCount || 0) === 1 ? "" : "s"}
      </p>

      {vehicleIncidents.length > 0 && (
        <SafetySummary incidents={vehicleIncidents} subject="vehicle" />
      )}

      {result.drivers.map((driver) => (
        <div key={driver.id} className="driver-info">
          <img
            src={driver.photoUrl || "/default-avatar.png"}
            alt={driver.name}
            className="driver-photo"
            onError={(e) => {
              e.target.src = "/default-avatar.png";
            }}
          />
          <h3>{driver.name}</h3>

          {driver.platforms?.length > 0 && (
            <p className="platform-tag">
              Platform: {driver.platforms.join(", ")}
            </p>
          )}

          <SafetySummary
            incidents={driver.incidents}
            subject="driver"
            contextNote={
              vehicleIncidents.length > 0
                ? `The linked vehicle has ${vehicleIncidents.length} confirmed incident${
                    vehicleIncidents.length === 1 ? "" : "s"
                  } — see the vehicle section above.`
                : null
            }
          />
        </div>
      ))}
    </div>
  );
}
