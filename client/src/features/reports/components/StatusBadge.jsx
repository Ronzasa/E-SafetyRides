export const STATUS_LABEL = {
  pending: 'Pending review',
  under_review: 'Under review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

const STATUS_BADGE_CLASS = {
  pending: 'badge-warning',
  under_review: 'badge-neutral',
  confirmed: 'badge-success',
  rejected: 'badge-danger',
};

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_BADGE_CLASS[status] || 'badge-neutral'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default StatusBadge;