import { WarningBanner } from "./warningBanner";

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
                {driver.vehicles.map((v) => v.plateNumber).join(", ")}
              </p>
            ) : (
              <p>No vehicle currently linked.</p>
            )}
            {driver.incidentCount > 0 && (
              <WarningBanner
                message={`This driver has ${driver.incidentCount} prior reported incident${driver.incidentCount > 1 ? "s" : ""}.`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Plate search results (unchanged from before)
  if (result.status === "NEW") {
    return (
      <div className="result-card result-new">
        <p>This vehicle isn't in our system yet.</p>
        <p>No driver history available — proceed with caution.</p>
      </div>
    );
  }

  if (!result.drivers || result.drivers.length === 0) {
    return (
      <div className="result-card result-unknown">
        <p>Vehicle found, but no driver is linked to it yet.</p>
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
        {result.vehicle.make} · {result.vehicle.colour} ·{" "}
        {result.vehicle.plateNumber}
      </p>

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

          {driver.incidentCount > 0 ? (
            <>
              <WarningBanner
                message={`This driver has ${driver.incidentCount} prior reported incident${driver.incidentCount > 1 ? "s" : ""}.`}
              />
              {driver.misconductHistory?.length > 0 && (
                <ul className="misconduct-list">
                  {driver.misconductHistory.map((entry, i) => (
                    <li key={i}>{entry}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="safe-badge">✅ No incidents on record</div>
          )}
        </div>
      ))}
    </div>
  );
}
