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
  if (!open || !event) return null;

  const isLinked = Boolean(event.project_id);
  const isCompleted = event.status === "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {event.title}
          </h2>

          <button
            onClick={onClose}
            className="text-slate-500 transition hover:text-red-500 dark:text-slate-400"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <FaUser className="text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.client || "No client"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.start
                ? event.start.toLocaleDateString()
                : event.date || "No date"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaClock className="text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.start
                ? event.start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : event.time}

              {event.end && (
                <>
                  {" "}
                  -{" "}
                  {event.end.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaTag className="text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.category || event.type || "General"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCamera className="text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.photographer || "Not Assigned"}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <FaStickyNote className="mt-1 text-sky-500" />
            <span className="text-slate-700 dark:text-slate-200">
              {event.notes || "No notes available."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCheckCircle
              className={isCompleted ? "text-emerald-500" : "text-slate-400 dark:text-slate-600"}
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

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => onDelete(event.id)}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
          >
            <div className="flex items-center gap-2">
              <FaTrash />
              Delete
            </div>
          </button>

          <button
            onClick={() => onEdit(event)}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
          >
            <div className="flex items-center gap-2">
              <FaEdit />
              Edit
            </div>
          </button>

          {isLinked && !isCompleted && (
            <button
              onClick={() => onComplete(event)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <div className="flex items-center gap-2">
                <FaCheckCircle />
                Complete
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetailsModal;