// Generic bottom-of-screen toast. Auto-dismisses on a timer set by whoever
// calls showToast() in the hook; clicking it dismisses early.
export function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <div
      className={`toast toast-${toast.type || "info"}`}
      role="status"
      onClick={onDismiss}
    >
      {toast.message}
    </div>
  );
}
