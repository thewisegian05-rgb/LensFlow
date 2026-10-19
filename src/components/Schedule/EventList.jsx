import {
  getEventCategory,
  CATEGORY_HEX,
  CATEGORY_LABELS,
} from "./eventCategory";

// Max rows shown per panel before " more".
const MAX_VISIBLE = 5;

const hexToRgba = (hex, alpha = 1) => {
  const normalized = (hex || "#d946ef").replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const value = Number.parseInt(safeHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCategoryStyle = (event, index) => {
  const category = getEventCategory(event);
  const hex = CATEGORY_HEX[category] || CATEGORY_HEX.default;

  return {
    backgroundColor: hexToRgba(hex, 0.1),
    borderColor: hexToRgba(hex, 0.3),
    borderLeftColor: hex,
    color: hex,
    "--i": index, // stagger index for the pop-up animation
  };
};

const formatTime = (date) =>
  date
    ? new Date(date).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

const formatShortDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

// Same shape as the Workflow loading card:
// title line, two shorter lines, then a button bar at the bottom.
function SkeletonCard() {
  return (
    <div className="event-skel-card">
      <div className="event-skel-line event-skel-title" />
      <div className="event-skel-line event-skel-sub1" />
      <div className="event-skel-line event-skel-sub2" />
      <div className="event-skel-btn" />
    </div>
  );
}

function EventList({
  title,
  dot = "bg-sky-400",
  events = [],
  loading = false,
  skeletonCount = 2,
  emptyText = "No events.",
  showDate = false,
  highlightId = null,
  onSelect,
}) {
  const visible = events.slice(0, MAX_VISIBLE);
  const hiddenCount = events.length - visible.length;

  return (
    <section className="event-list rounded-xl border border-slate-700 bg-slate-900 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`event-dot h-2 w-2 rounded-full ${dot}`} />
          {title}
        </h3>

        {!loading && (
          <span className="event-count rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
            {events.length}
          </span>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
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
            const isNew = event.id === highlightId;
            const isDone = event.status === "completed";

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect?.(event)}
                style={getCategoryStyle(event, index)}
                className={`event-row ${
                  isNew ? "event-row-new" : ""
                } flex w-full items-center gap-3 rounded-lg border border-l-4 px-3 py-2 text-left`}
              >
                <div className="w-16 flex-shrink-0 text-xs">
                  <p className="font-semibold">{formatTime(event.start)}</p>
                  {showDate && (
                    <p className="mt-0.5 opacity-70">
                      {formatShortDate(event.start)}
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {event.title || "Untitled Event"}
                  </p>
                  <p className="truncate text-xs opacity-70">
                    {[event.client, categoryLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>

                {isDone && (
                  <span className="event-done-badge flex-shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Done
                  </span>
                )}
              </button>
            );
          })}

          {hiddenCount > 0 && (
            <p className="event-more pt-1 text-center text-xs text-slate-500">
              +{hiddenCount} more
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default EventList;