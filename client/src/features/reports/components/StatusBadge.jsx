const STATUS_STYLES = {
  pending: { label: 'Pending review', className: 'bg-gray-100 text-gray-700' },
  under_review: { label: 'Under review', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', className: 'bg-orange-100 text-orange-800' },
  rejected: { label: 'Rejected', className: 'bg-gray-100 text-gray-500' },
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${style.className}`}>
      {style.label}
    </span>
  );
}

export default StatusBadge;