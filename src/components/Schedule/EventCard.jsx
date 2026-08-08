import { getEventCategory, CATEGORY_LABELS, CATEGORY_BADGE_CLASSES, CATEGORY_HOVER_BORDER_CLASSES } from "./eventCategory";

function EventCard({ event }) {
  // Same detection logic Calendar.jsx uses — reads event.category /
  // event.title instead of a `type` field that doesn't actually exist
  // on these objects (that mismatch is why every badge was falling
  // back to the same purple before).
  const category = getEventCategory(event);

  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-800 p-4 cursor-pointer
        transition-all duration-200 ease-out
        hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 hover:bg-slate-800/80
        ${CATEGORY_HOVER_BORDER_CLASSES[category]}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-white font-semibold">
            {event.title}
          </h3>

          <p className="text-slate-400 text-sm">
            {event.client}
          </p>
        </div>

        <span
          className={`px-2 py-1 rounded text-xs text-white ${CATEGORY_BADGE_CLASSES[category]}`}
        >
          {CATEGORY_LABELS[category]}
        </span>
      </div>

      <p className="text-slate-300 text-sm">
        📅 {event.date}
      </p>

      <p className="text-slate-300 text-sm">
        🕒 {event.time}
      </p>
    </div>
  );
}

export default EventCard;
