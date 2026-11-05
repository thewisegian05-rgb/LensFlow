import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

import BookingPanel from "./BookingPanel";

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
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="custom-scrollbar fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Book a schedule</h2>
            <p className="mt-0.5 text-xs text-slate-400">{date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
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