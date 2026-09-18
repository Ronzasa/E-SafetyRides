import { useState } from "react";
import { searchByPlate, searchByName } from "./driverSearchApi";

export function useDriverSearch() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search(query, mode = "plate") {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data =
        mode === "name"
          ? await searchByName(query)
          : await searchByPlate(query);
      setResult({ ...data, mode });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, search };
}
