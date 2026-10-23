import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { usePendingDeletes } from "../../lib/pendingDeletes";
import {
  getEventCategory,
  CATEGORY_HEX,
  CATEGORY_LABELS,
} from "../Schedule/eventCategory";

// Same category colors the Calendar and Schedule lists use.
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

function TodaySchedule() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Events currently being deleted (from the Schedule page, even if
  // you've already switched away from it).
  const pendingIds = usePendingDeletes();
  const prevPendingCount = useRef(pendingIds.size);

  // `silent` = refetch without flashing the "Loading…" state.
  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .from("schedule_events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to load schedule events:", error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    const mapped = data.map((row) => ({
      id: row.id,
      title: row.title,
      client: row.client,
      category: row.category,
      status: row.status,
      start: new Date(row.start_time),
      end: new Date(row.end_time),
    }));

    setEvents(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Refetch ONLY when a delete finishes (count goes down). If we
  // refetched when it started, the row could vanish before its exit
  // animation had a chance to play.
  useEffect(() => {
    if (pendingIds.size < prevPendingCount.current) {
      fetchEvents(true);
    }
    prevPendingCount.current = pendingIds.size;
  }, [pendingIds]);

  // =========================================================
  // NEXT 5 UPCOMING EVENTS (today onward, not yet completed)
  // =========================================================

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    return events
      .filter((event) => {
        if (!event.start) return false;
        if (event.status === "completed") return false;
        return event.start >= startOfToday;
      })
      .sort((a, b) => a.start - b.start)
      .slice(0, 5);
  }, [events]);

  const formatTime = (date) =>
    date
      ? new Date(date).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  const formatDay = (date) => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfEvent = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const diffDays = Math.round(
      (startOfEvent - startOfToday) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Upcoming Schedule
        </h3>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
          {upcomingEvents.length}
        </span>
      </header>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
      ) : upcomingEvents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
          Nothing coming up.
        </p>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map((event) => {
            const category = getEventCategory(event);
            const categoryLabel = CATEGORY_LABELS[category] || event.category;

            return (
              <div
                key={event.id}
                style={getCategoryStyle(event)}
                className={`flex items-center gap-3 rounded-lg border border-l-4 px-3 py-2 ${
                  pendingIds.has(event.id) ? "event-row-leaving" : ""
                }`}
              >
                <div className="w-16 flex-shrink-0 text-xs">
                  <p className="font-semibold">{formatTime(event.start)}</p>
                  <p className="mt-0.5 opacity-70">{formatDay(event.start)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {event.title || "Untitled Event"}
                  </p>
                  <p className="truncate text-xs opacity-70">
                    {[event.client, categoryLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TodaySchedule;