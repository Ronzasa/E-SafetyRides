import { useNavigate } from 'react-router-dom';
import IncidentReportForm from '../features/reports/components/IncidentReportForm';

export default function ReportIncident() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate('/my-reports');
  }

  return <IncidentReportForm onSuccess={handleSuccess} />;
}
