import { useEffect, useMemo, useState } from "react";
import { FaClock, FaCalendarAlt } from "react-icons/fa";

function TodaySchedule() {
  const [events, setEvents] = useState([]);

  // =========================================================
  // LOAD EVENTS
  // =========================================================

  useEffect(() => {
    const loadEvents = () => {
      const savedEvents =
        localStorage.getItem("lensease_events");

      if (!savedEvents) {
        setEvents([]);
        return;
      }

      try {
        const parsedEvents = JSON.parse(savedEvents).map(
          (event) => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
          })
        );

        setEvents(parsedEvents);
      } catch (error) {
        console.error(
          "Failed to load schedule events:",
          error
        );

        setEvents([]);
      }
    };

    loadEvents();

    window.addEventListener(
      "storage",
      loadEvents
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadEvents
      );
    };
  }, []);

  // =========================================================
  // TODAY'S EVENTS
  // =========================================================

  const todayEvents = useMemo(() => {
    const today = new Date();

    return events
      .filter((event) => {
        if (!event.start) return false;

        const eventDate = new Date(event.start);

        return (
          eventDate.getFullYear() ===
            today.getFullYear() &&
          eventDate.getMonth() ===
            today.getMonth() &&
          eventDate.getDate() ===
            today.getDate()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.start) -
          new Date(b.start)
      );
  }, [events]);

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatMonth = (date) => {
    return new Date(date)
      .toLocaleDateString("en-US", {
        month: "short",
      })
      .toUpperCase();
  };

  const formatDay = (date) => {
    return new Date(date).getDate();
  };

  // =========================================================
  // CARD
  // =========================================================

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg">

      {/* ===================================================
          HEADER
          =================================================== */}

      <h3 className="text-white text-lg font-semibold mb-5">
        Today's Schedule
      </h3>

      {/* ===================================================
          NO EVENTS
          =================================================== */}

      {todayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">

          <FaCalendarAlt className="text-slate-600 text-3xl mb-3" />

          <p className="text-slate-400 text-sm">
            No events scheduled for today.
          </p>

          <p className="text-slate-600 text-xs mt-1">
            Your schedule is clear.
          </p>

        </div>
      ) : (

        /* =================================================
           EVENTS
           ================================================= */

        <div className="space-y-4">

          {todayEvents.map((event) => (

            <div
              key={event.id}
              className="flex gap-4 items-start"
            >

              {/* DATE */}

              <div className="flex flex-col items-center justify-center bg-sky-500/10 text-sky-500 w-12 h-12 rounded-lg flex-shrink-0">

                <span className="text-xs font-bold">
                  {formatMonth(event.start)}
                </span>

                <span className="text-lg font-bold leading-none">
                  {formatDay(event.start)}
                </span>

              </div>

              {/* EVENT INFO */}

              <div className="min-w-0">

                <h4 className="text-white font-medium text-sm truncate">
                  {event.title ||
                    "Untitled Event"}
                </h4>

                {event.client && (
                  <p className="text-xs text-slate-400 mt-1">
                    {event.client}
                  </p>
                )}

                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">

                  <FaClock />

                  {formatTime(event.start)}

                  {event.end && (
                    <>
                      {" - "}
                      {formatTime(event.end)}
                    </>
                  )}

                </p>

                {event.category && (
                  <span className="inline-block mt-2 bg-sky-500/10 text-sky-400 text-xs px-2 py-1 rounded">
                    {event.category}
                  </span>
                )}

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

export default TodaySchedule;