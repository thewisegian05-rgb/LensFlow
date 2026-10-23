// src/components/Common/DeleteToast.jsx
import { usePendingDeleteItems } from "../../lib/pendingDeletes";

// Bottom-right "Deleting..." toast. Mount it ONCE in a component that
// stays mounted across pages (App.jsx / main layout), so it keeps
// showing even when you switch tabs.
function DeleteToast() {
  const items = usePendingDeleteItems();

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="delete-toast pointer-events-auto relative w-72 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-xl shadow-black/40"
        >
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-500" />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Deleting...</p>
              <p className="truncate text-xs text-slate-400">
                {item.label || "Event"}
              </p>
            </div>
          </div>

          <span className="delete-toast-bar" />
        </div>
      ))}
    </div>
  );
}

export default DeleteToast;