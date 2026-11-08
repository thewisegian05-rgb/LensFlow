import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

import BookingPanel from "./BookingPanel";

const scrollbar = `
  [scrollbar-width:thin]
  [scrollbar-color:#cbd5e1_transparent]
  dark:[scrollbar-color:#334155_transparent]
  [&::-webkit-scrollbar]:w-2
  [&::-webkit-scrollbar-track]:my-2
  [&::-webkit-scrollbar-track]:bg-transparent
  [&::-webkit-scrollbar-thumb]:rounded-full
  [&::-webkit-scrollbar-thumb]:bg-slate-300
  [&::-webkit-scrollbar-thumb:hover]:bg-sky-500
  dark:[&::-webkit-scrollbar-thumb]:bg-slate-700
`;

/** Popup shown when a client clicks a date on the portal calendar. */
export default function BookingModal({
  open,
  date,
  photographerId,
  events,
  onClose,
  onChanged,
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0">
            <h2
              id="booking-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Book a schedule
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {date}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking form"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className={`min-h-0 overflow-y-auto bg-white p-3 sm:p-4 dark:bg-slate-900 ${scrollbar}`}>
          <BookingPanel
            photographerId={photographerId}
            events={events}
            initialDate={date}
            onChanged={onChanged}
            onBooked={onClose}
          />
        </div>
      </div>
    </div>
  );
}
