// src/components/Common/DeleteToast.jsx
import { usePendingDeleteItems } from "../../lib/pendingDeletes";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10" cy="10" r="8" opacity="0.35" />
      <path d="M6.5 10.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10" cy="10" r="8" opacity="0.35" />
      <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
    </svg>
  );
}

// Bottom-right toast: spinner while deleting, then a short

function DeleteToast() {
  const items = usePendingDeleteItems();

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => {
        const isDeleting = item.status === "deleting";
        const isDone = item.status === "done";

        return (
          <div
            key={item.id}
            className="delete-toast pointer-events-auto relative w-72 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-xl shadow-black/40"
          >
            <div className="flex items-center gap-3">
              {isDeleting && (
                <span className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-500" />
              )}
              {isDone && <CheckIcon />}
              {item.status === "error" && <ErrorIcon />}

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {isDeleting
                    ? "Deleting..."
                    : isDone
                    ? "Deleted"
                    : "Delete failed"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {item.status === "error" && item.message
                    ? item.message
                    : item.label || "Item"}
                </p>
              </div>
            </div>

            {isDeleting && <span className="delete-toast-bar" />}
          </div>
        );
      })}
    </div>
  );
}

export default DeleteToast;