export function WarningBanner({ message }) {
  if (!message) return null;

  return <div className="warning-banner">⚠️ {message}</div>;
}
