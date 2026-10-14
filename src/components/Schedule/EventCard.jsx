import { getEventCategory, CATEGORY_LABELS, CATEGORY_BADGE_CLASSES, CATEGORY_HOVER_BORDER_CLASSES } from "./eventCategory";

function EventCard({ event }) {

  const category = getEventCategory(event);

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 cursor-pointer
        transition-all duration-200 ease-out
        hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 hover:bg-slate-50
        dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/80 dark:hover:shadow-black/30
        ${CATEGORY_HOVER_BORDER_CLASSES[category]}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-slate-900 font-semibold dark:text-slate-100">
            {event.title}
          </h3>

          <p className="text-slate-600 text-sm dark:text-slate-300">
            {event.client}
          </p>
        </div>

        <span
          className={`px-2 py-1 rounded text-xs text-white ${CATEGORY_BADGE_CLASSES[category]}`}
        >
          {CATEGORY_LABELS[category]}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {event.date || (event.start ? new Date(event.start).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }) : "No date")}
      </p>

      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {event.time || (event.start ? new Date(event.start).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }) : "No time")}
      </p>
    </div>
  );
}

export default EventCard;
