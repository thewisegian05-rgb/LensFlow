import { useEffect, useMemo, useState } from "react";
import { FaClock, FaCalendarAlt } from "react-icons/fa";
import { supabase } from "../../lib/supabaseClient";

function TodaySchedule() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);

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

    fetchEvents();
  }, []);

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
          hour: "2-digit",
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          Upcoming Schedule
        </h3>
        <span className="text-xs text-slate-500">
          {upcomingEvents.length}{" "}
          {upcomingEvents.length === 1 ? "event" : "events"}
        </span>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm py-6 text-center">Loading…</p>
      ) : upcomingEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FaCalendarAlt className="text-slate-700 text-2xl mb-2" />
          <p className="text-slate-500 text-sm">Nothing coming up.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center justify-center bg-sky-500/10 text-sky-400 w-14 h-9 rounded-md flex-shrink-0 text-[10px] font-semibold px-1 text-center leading-tight">
                {formatDay(event.start)}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-white text-sm font-medium truncate">
                  {event.title || "Untitled Event"}
                </h4>
                {event.client && (
                  <p className="text-xs text-slate-500 truncate">
                    {event.client}
                  </p>
                )}
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <FaClock className="text-[10px]" />
                  {formatTime(event.start)}
                  {event.end && ` – ${formatTime(event.end)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TodaySchedule;