import { WarningBanner } from "./warningBanner";

const INCIDENT_TYPE_LABEL = {
  unsafe_driving: "Unsafe driving",
  harassment: "Harassment",
  robbery: "Robbery",
  assault: "Assault",
  other: "Other",
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function describeIncident(incident) {
  const type = INCIDENT_TYPE_LABEL[incident.type] || incident.type;

  return [
    type,
    incident.severity ? `${incident.severity} severity` : null,
    incident.area,
    formatDate(incident.createdAt),
  ]
    .filter(Boolean)
    .join(" · ");
}

// Public safety record for a driver or vehicle: a safe badge when there are
// no confirmed incidents, otherwise a warning with the incident details.
// Only confirmed incidents are ever passed in — pending/rejected reports
// never reach this component. When contextNote is provided (e.g. the linked
// vehicle carries incidents the driver is not named on), the empty state
// must not read as a clean bill of health for the subject.
export function SafetySummary({ incidents = [], subject = "driver", contextNote = null }) {
  if (!incidents.length) {
    if (contextNote) {
      return (
        <div className="context-note">
          No confirmed incidents against this {subject}. {contextNote}
        </div>
      );
    }

    return (
      <div className="safe-badge">✓ No confirmed incidents on record</div>
    );
  }

  return (
    <>
      <WarningBanner
        message={`This ${subject} has ${incidents.length} confirmed incident${
          incidents.length > 1 ? "s" : ""
        }.`}
      />
      <ul className="misconduct-list">
        {incidents.map((incident) => (
          <li key={incident.id}>
            <strong>{describeIncident(incident)}</strong>
            {incident.description && (
              <p className="incident-description">{incident.description}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
