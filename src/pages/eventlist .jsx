// Save as: src/components/Schedule/EventList.jsx
import {
  getEventCategory,
  CATEGORY_HEX,
  CATEGORY_LABELS,
} from "./eventCategory";

// Same category colors the Calendar uses, so a wedding looks the same
// in the lists as it does on the calendar.
const hexToRgba = (hex, alpha = 1) => {
  const normalized = (hex || "#d946ef").replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;

  const value = Number.parseInt(safeHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCategoryStyle = (event) => {
  const category = getEventCategory(event);
  const hex = CATEGORY_HEX[category] || CATEGORY_HEX.default;

  return {
    backgroundColor: hexToRgba(hex, 0.1),
    borderColor: hexToRgba(hex, 0.3),
    borderLeftColor: hex,
    color: hex,
  };
};

// COMPACT EVENT LIST (Today's Events / Coming Events) - animated
function EventList({
  title,
  dot,
  events,
  loading,
  emptyText,
  showDate = false,
  limit = 5,
  highlightId = null,
  onSelect,
}) {
  const visible = events.slice(0, limit);
  const hidden = events.length - visible.length;

  return (
    <section className="event-list rounded-xl border border-slate-700 bg-slate-900 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`event-dot h-2 w-2 rounded-full ${dot}`} />
          {title}
        </h3>
        {/* key={events.length} replays the pop animation when the count changes */}
        <span
          key={events.length}
          className="event-count rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300"
        >
          {events.length}
        </span>
      </header>

      {loading ? (
        <div className="space-y-2">
          <div className="event-skeleton" />
          <div className="event-skeleton" style={{ animationDelay: "0.15s" }} />
          <div className="event-skeleton" style={{ animationDelay: "0.3s" }} />
        </div>
      ) : events.length === 0 ? (
        <p className="event-more rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((event, index) => {
            const category = getEventCategory(event);
            const categoryLabel = CATEGORY_LABELS[category] || event.category;

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event)}
                style={{ ...getCategoryStyle(event), "--i": index }}
                className={`${
                  event.id === highlightId ? "event-row-new" : "event-row"
                } flex w-full items-center gap-3 rounded-lg border border-l-4 px-3 py-2 text-left`}
              >
                <div className="w-16 flex-shrink-0 text-xs">
                  <p className="font-semibold">{event.time}</p>
                  {showDate && (
                    <p className="mt-0.5 opacity-70">
                      {event.start.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs opacity-70">
                    {[event.client, categoryLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>

                {event.status === "completed" && (
                  <span className="event-done-badge flex-shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Done
                  </span>
                )}
              </button>
            );
          })}

          {hidden > 0 && (
            <p className="event-more pt-1 text-center text-xs text-slate-500">
              +{hidden} more in the calendar below
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default EventList;