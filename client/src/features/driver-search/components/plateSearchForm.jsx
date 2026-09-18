import { useState } from "react";

const PLATE_CHAR_REGEX = /[^A-Za-z0-9]/g;
const NAME_CHAR_REGEX = /[^A-Za-z\s'-]/g;

const PLATE_MAX_LENGTH = 8;
const NAME_MAX_LENGTH = 50;

// Must match the rule the server enforces on report plates (normalisePlate +
// isValidPlate): 1-8 letters/digits after normalisation. A stricter shape
// here would make plates accepted by the report form unsearchable in the UI.
const PLATE_FORMAT_REGEX = /^[A-Z0-9]{1,8}$/;
const NAME_FORMAT_REGEX = /^[A-Za-z]+([\s'-][A-Za-z]+)*$/;

export function PlateSearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("plate");
  const [validationError, setValidationError] = useState("");

  function handleModeChange(newMode) {
    setMode(newMode);
    setQuery("");
    setValidationError("");
  }

  function handleChange(e) {
    let value = e.target.value;

    if (mode === "plate") {
      value = value
        .replace(PLATE_CHAR_REGEX, "")
        .toUpperCase()
        .slice(0, PLATE_MAX_LENGTH);
    } else {
      value = value.replace(NAME_CHAR_REGEX, "").slice(0, NAME_MAX_LENGTH);
    }

    setQuery(value);
    if (validationError) setValidationError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) return;

    if (mode === "plate" && !PLATE_FORMAT_REGEX.test(trimmed)) {
      setValidationError(
        "That doesn't look like a valid plate number. Try e.g. ABC123GP.",
      );
      return;
    }

    if (mode === "name" && !NAME_FORMAT_REGEX.test(trimmed)) {
      setValidationError("Please enter a valid name (letters only).");
      return;
    }

    setValidationError("");
    onSearch(trimmed, mode);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="plate-search-form">
        <div className="search-mode-toggle">
          <button
            type="button"
            className={mode === "plate" ? "mode-active" : ""}
            onClick={() => handleModeChange("plate")}
          >
            By Plate
          </button>
          <button
            type="button"
            className={mode === "name" ? "mode-active" : ""}
            onClick={() => handleModeChange("name")}
          >
            By Name
          </button>
        </div>
        <div className="search-input-row">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={
              mode === "plate" ? "e.g. ABC123GP" : "Enter driver name"
            }
            disabled={loading}
            maxLength={mode === "plate" ? PLATE_MAX_LENGTH : NAME_MAX_LENGTH}
            style={
              mode === "plate"
                ? { textTransform: "uppercase", letterSpacing: "0.04em" }
                : undefined
            }
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>
      {validationError && (
        <div className="validation-error">{validationError}</div>
      )}
    </>
  );
}
