
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaCamera,
  FaTag,
  FaStickyNote,
  FaTrash,
  FaEdit,
  FaCheckCircle,
} from "react-icons/fa";

function EventDetailsModal({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
  onComplete,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  
  useEffect(() => {
    if (!open || !event) {
      setIsVisible(false);
      return;
    }

    setIsMounted(true);
    setIsVisible(false);

    // Give the browser time to render the initial hidden state.
    let firstFrame;
    let secondFrame;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [open, event]);


  const handleClose = () => {
    setIsVisible(false);
  };

  const handleTransitionEnd = (e) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !isVisible
    ) {
      setIsMounted(false);
      onClose();
    }
  };

  // Keep the modal mounted long enough to animate out.
  if (!isMounted || !event) return null;

  const isLinked = Boolean(event.project_id);
  const isCompleted = event.status === "completed";

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[99999]
        flex items-center justify-center
        overflow-y-auto p-4
        bg-slate-950/60 backdrop-blur-sm
        transition-opacity duration-200 ease-out
        ${
          isVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }
        motion-reduce:transition-none
      `}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onTransitionEnd={handleTransitionEnd}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        className={`
          my-auto w-full max-w-xl
          max-h-[calc(100dvh-2rem)] overflow-y-auto
          rounded-2xl border border-slate-200
          bg-white p-6 shadow-2xl
          transition-all duration-300 ease-out
          dark:border-slate-700 dark:bg-slate-900
          ${
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.97] opacity-0"
          }
          motion-reduce:transform-none
          motion-reduce:transition-none
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2
            id="event-details-title"
            className="min-w-0 break-words text-2xl font-bold text-slate-900 dark:text-white"
          >
            {event.title}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close event details"
            className="
              flex h-9 w-9 shrink-0 items-center justify-center
              rounded-lg text-slate-500
              transition-all duration-200 ease-out
              hover:scale-105 hover:bg-red-50 hover:text-red-500
              active:scale-95
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-sky-500
              dark:text-slate-400 dark:hover:bg-red-500/10
              dark:hover:text-red-400
            "
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Event information */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <FaUser className="shrink-0 text-sky-500" />
            <span className="break-words text-slate-700 dark:text-slate-200">
              {event.client || "No client"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCalendarAlt className="shrink-0 text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.start
                ? event.start.toLocaleDateString()
                : event.date || "No date"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaClock className="shrink-0 text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.start
                ? event.start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : event.time}

              {event.end && (
                <>
                  {" - "}
                  {event.end.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaTag className="shrink-0 text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.category || event.type || "General"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCamera className="shrink-0 text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.photographer || "Not Assigned"}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <FaStickyNote className="mt-1 shrink-0 text-sky-500" />
            <span className="break-words text-slate-700 dark:text-slate-200">
              {event.notes || "No notes available."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCheckCircle
              className={
                isCompleted
                  ? "shrink-0 text-emerald-500"
                  : "shrink-0 text-slate-400 dark:text-slate-600"
              }
            />
            <span className="text-slate-700 dark:text-slate-200">
              {isCompleted
                ? "Shoot marked complete"
                : isLinked
                ? "Linked to a project — not completed yet"
                : "Not linked to a project"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="
              flex items-center gap-2 rounded-lg
              border border-red-200 bg-red-50 px-4 py-2
              font-semibold text-red-700
              transition-all duration-200 ease-out
              hover:-translate-y-0.5 hover:bg-red-100
              active:translate-y-0
              dark:border-red-500/30 dark:bg-red-500/10
              dark:text-red-300 dark:hover:bg-red-500/20
            "
          >
            <FaTrash />
            Delete
          </button>

          <button
            type="button"
            onClick={() => onEdit(event)}
            className="
              flex items-center gap-2 rounded-lg
              border border-sky-200 bg-sky-50 px-4 py-2
              font-semibold text-sky-700
              transition-all duration-200 ease-out
              hover:-translate-y-0.5 hover:bg-sky-100
              active:translate-y-0
              dark:border-sky-500/30 dark:bg-sky-500/10
              dark:text-sky-300 dark:hover:bg-sky-500/20
            "
          >
            <FaEdit />
            Edit
          </button>

          {isLinked && !isCompleted && (
            <button
              type="button"
              onClick={() => onComplete(event)}
              className="
                flex items-center gap-2 rounded-lg
                border border-emerald-200 bg-emerald-50 px-4 py-2
                font-semibold text-emerald-700
                transition-all duration-200 ease-out
                hover:-translate-y-0.5 hover:bg-emerald-100
                active:translate-y-0
                dark:border-emerald-500/30 dark:bg-emerald-500/10
                dark:text-emerald-300 dark:hover:bg-emerald-500/20
              "
            >
              <FaCheckCircle />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default EventDetailsModal;
