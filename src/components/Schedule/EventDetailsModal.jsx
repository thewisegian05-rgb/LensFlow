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
} from "react-icons/fa";

function EventDetailsModal({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
}) {
  if (!open || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

        {/* Header */}

        <div className="mb-6 flex items-center justify-between">

          <h2 className="text-2xl font-bold text-white">
            {event.title}
          </h2>

          <button
            onClick={onClose}
            className="text-slate-400 transition hover:text-red-400"
          >
            <FaTimes size={20} />
          </button>

        </div>

        {/* Details */}

        <div className="space-y-5">

          <div className="flex items-center gap-3">
            <FaUser className="text-sky-400" />
            <span className="text-slate-200">
              {event.client || "No client"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-sky-400" />
            <span className="text-slate-200">
              {event.start
                ? event.start.toLocaleDateString()
                : event.date || "No date"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaClock className="text-sky-400" />

            <span className="text-slate-200">

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
            <FaTag className="text-sky-400" />
            <span className="text-slate-200">
              {event.category || event.type || "General"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <FaCamera className="text-sky-400" />
            <span className="text-slate-200">
              {event.photographer || "Not Assigned"}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <FaStickyNote className="mt-1 text-sky-400" />
            <span className="text-slate-200">
              {event.notes || "No notes available."}
            </span>
          </div>

        </div>

        {/* Buttons */}

        <div className="mt-8 flex justify-end gap-3">

          <button
            onClick={() => onDelete(event.id)}
            className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-600"
          >
            <div className="flex items-center gap-2">
              <FaTrash />
              Delete
            </div>
          </button>

          <button
            onClick={() => onEdit(event)}
            className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-sky-600"
          >
            <div className="flex items-center gap-2">
              <FaEdit />
              Edit
            </div>
          </button>

        </div>

      </div>

    </div>
  );
}

export default EventDetailsModal;