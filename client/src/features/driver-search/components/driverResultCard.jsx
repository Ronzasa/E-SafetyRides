import { WarningBanner } from "./warningBanner";
import { SafetySummary } from "./SafetySummary";

function formatVehicleLine(vehicle) {
  if (!vehicle) return "Unknown vehicle";

  return [vehicle.make, vehicle.colour, vehicle.plateNumber]
    .filter(Boolean)
    .join(" · ");
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
            <SafetySummary incidents={driver.incidents} subject="driver" />
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

          <p className="verification-count">
            Verified {result.vehicle.verificationCount || 0} time
            {(result.vehicle.verificationCount || 0) === 1 ? "" : "s"}
          </p>

          <SafetySummary incidents={driver.incidents} subject="driver" />
        </div>
      ))}
    </div>
  );
}
