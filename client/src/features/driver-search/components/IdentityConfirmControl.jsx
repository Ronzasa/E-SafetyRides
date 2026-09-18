import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createIncident } from "../../reports/reportsApi";

// Sits inline on a driver card. Idle by default (a small button) so it
// never covers the profile or the incident list — the passenger reads
// everything first, then opts in.
//
// stage: "idle" -> "asking" -> ("done" | "submitting" -> "done")
export function IdentityConfirmControl({ target, showToast }) {
  const [stage, setStage] = useState("idle");
  const navigate = useNavigate();

  if (!target) return null;

  function askAgain() {
    setStage("idle");
  }

  function handleYes() {
    navigate(`/verify-driver?plate=${encodeURIComponent(target.plate)}`);
  }

  async function handleNo() {
    setStage("submitting");

    try {
      const outcome = await createIncident({
        plate: target.plate,
        driverName: target.driverName,
        platform: target.platform || "other",
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
      setStage("done");
    }
  }

  if (stage === "idle") {
    return (
      <button
        type="button"
        className="btn-secondary btn-sm identity-confirm-trigger"
        onClick={() => setStage("asking")}
      >
        Is this your pickup driver?
      </button>
    );
  }

  if (stage === "asking") {
    return (
      <div className="identity-confirm-prompt">
        <p>Does this match the driver who actually picked you up?</p>

        <div className="identity-confirm-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleNo}
          >
            No, doesn't match
          </button>

          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleYes}
          >
            Yes, Verify
          </button>
        </div>
      </div>
    );
  }

  if (stage === "submitting") {
    return <p className="identity-confirm-status">Filing a report…</p>;
  }

  // done
  return (
    <button
      type="button"
      className="btn-secondary btn-sm identity-confirm-trigger"
      onClick={askAgain}
    >
      Confirmed — check again?
    </button>
  );
}
