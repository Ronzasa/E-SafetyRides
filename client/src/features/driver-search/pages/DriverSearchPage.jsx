import { useDriverSearch } from "../driverSearchHooks";
import { PlateSearchForm } from "../components/plateSearchForm";
import { DriverResultCard } from "../components/driverResultCard";
import GoBackButton from "../../../components/GoBackButton";

export default function DriverSearchPage() {
  const { result, loading, error, search } = useDriverSearch();

  return (
    <div className="driver-search-page">
      <GoBackButton />
      <h1>Driver Search</h1>
      <p>
        Enter a number plate to check driver identity and safety history before
        your ride.
      </p>

      <PlateSearchForm onSearch={search} loading={loading} />

      {error && <div className="error-message">{error}</div>}

      <DriverResultCard result={result} />
    </div>
  );
}
