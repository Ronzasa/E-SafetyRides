import { AppIcon, PageIntro, SafetyAppShell } from '../../../components/SafetyAppShell';
import { useDriverSearch } from '../driverSearchHooks';
import { PlateSearchForm } from '../components/plateSearchForm';
import { DriverResultCard } from '../components/driverResultCard';
import { Toast } from '../components/Toast';

export default function DriverSearchPage() {
  const { result, loading, error, search, toast, showToast, dismissToast } = useDriverSearch();

  return (
    <SafetyAppShell>
      <div className="app-content">
        <PageIntro
          eyebrow="Before you ride"
          title="Search a driver"
          description="Check a plate number or driver name to see public safety history before you get in."
        />

        <section className="driver-search-hero" aria-labelledby="driver-search-title">
          <div className="search-hero-icon"><AppIcon name="shield" size={25} /></div>
          <h2 id="driver-search-title">Check a driver or vehicle</h2>
          <p>Use the plate shown on the vehicle, or search a driver by name when you have it.</p>
          <PlateSearchForm onSearch={search} loading={loading} />
          <div className="search-trust"><AppIcon name="shield" size={15} /> Searches are private and never shared with drivers</div>
        </section>

        {error && <div className="error-message">{error}</div>}
        <div className="driver-result-wrap">
          <DriverResultCard result={result} showToast={showToast} />
        </div>
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </SafetyAppShell>
  );
}
