import { useState } from 'react';
import IncidentReportForm from './features/reports/components/IncidentReportForm';
import MyReportsList from './features/reports/components/MyReportsList';
import BrowseReports from './features/reports/components/BrowseReports';

function App() {
  const [view, setView] = useState('report');
  const [refreshKey, setRefreshKey] = useState(0);

  function handleReportSuccess() {
    setRefreshKey((k) => k + 1);
    setView('mine');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">E-SafetyRides</h1>
          <nav className="flex gap-1 text-sm">
            <button
              type="button"
              onClick={() => setView('report')}
              className={`px-3 py-1.5 rounded-md font-medium ${
                view === 'report' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => setView('mine')}
              className={`px-3 py-1.5 rounded-md font-medium ${
                view === 'mine' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              My Reports
            </button>

            <button
              type="button"
              onClick={() => setView('browse')}
              className={`px-3 py-1.5 rounded-md font-medium ${
                view === 'browse' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Browse
            </button>

          </nav>
        </div>
      </header>

      <main className="py-8">
        {view === 'report' && <IncidentReportForm onSuccess={handleReportSuccess} />}
        {view === 'mine' && <MyReportsList refreshKey={refreshKey} />}
        {view === 'browse' && <BrowseReports />}
      </main>
    </div>
  );
}

export default App;