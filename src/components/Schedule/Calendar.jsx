import { useMemo, useState } from "react";

import format from "date-fns/format";
import startOfWeek from "date-fns/startOfWeek";
import addDays from "date-fns/addDays";
import subWeeks from "date-fns/subWeeks";
import addWeeks from "date-fns/addWeeks";
import subMonths from "date-fns/subMonths";
import addMonths from "date-fns/addMonths";
import startOfMonth from "date-fns/startOfMonth";
import endOfMonth from "date-fns/endOfMonth";
import endOfWeek from "date-fns/endOfWeek";
import isSameDay from "date-fns/isSameDay";
import isSameMonth from "date-fns/isSameMonth";
import isToday from "date-fns/isToday";

import "./Calendar.css";
import { CATEGORY_HEX, getEventCategory } from "./eventCategory";

function Calendar({
  events = [],
  onSelectSlot,
  onEventClick,
}) {
  // =========================================================
  // VIEW
  // =========================================================

  const [view, setView] = useState("month");

  const [currentDate, setCurrentDate] = useState(
    new Date()
  );

  // =========================================================
  // NAVIGATION
  // =========================================================

  const goPrevious = () => {
    if (view === "week") {
      setCurrentDate((prev) =>
        subWeeks(prev, 1)
      );
    } else {
      setCurrentDate((prev) =>
        subMonths(prev, 1)
      );
    }
  };

  const goNext = () => {
    if (view === "week") {
      setCurrentDate((prev) =>
        addWeeks(prev, 1)
      );
    } else {
      setCurrentDate((prev) =>
        addMonths(prev, 1)
      );
    }
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  // =========================================================
  // WEEK START
  // MONDAY
  // =========================================================

  const weekStart = useMemo(() => {
    return startOfWeek(currentDate, {
      weekStartsOn: 1,
    });
  }, [currentDate]);

  // =========================================================
  // WEEK DAYS
  // =========================================================

  const weekDays = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, index) =>
        addDays(weekStart, index)
    );
  }, [weekStart]);

  // =========================================================
  // MONTH DAYS
  // =========================================================

  const monthDays = useMemo(() => {
    const monthStart =
      startOfMonth(currentDate);

    const monthEnd =
      endOfMonth(currentDate);

    const calendarStart =
      startOfWeek(monthStart, {
        weekStartsOn: 1,
      });

    const calendarEnd =
      endOfWeek(monthEnd, {
        weekStartsOn: 1,
      });

    const days = [];

    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);

      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  // =========================================================
  // TITLES
  // =========================================================

  const monthTitle = format(
    currentDate,
    "MMMM yyyy"
  );

  const weekTitle = `${format(
    weekDays[0],
    "MMM d"
  )} – ${format(
    weekDays[6],
    "MMM d, yyyy"
  )}`;

  // =========================================================
  // GET EVENTS FOR DAY
  // =========================================================

  const getEventsForDay = (day) => {
    return events
      .filter((event) => {
        if (!event.start) {
          return false;
        }

        return isSameDay(
          new Date(event.start),
          day
        );
      })
      .sort((a, b) => {
        return (
          new Date(a.start) -
          new Date(b.start)
        );
      });
  };

  // =========================================================
  // EVENT TIME
  // =========================================================

  const formatEventTime = (event) => {
    if (!event.start) {
      return "";
    }

    return format(
      new Date(event.start),
      "h:mm a"
    );
  };

  // =========================================================
  // EVENT COLOR
  // =========================================================

  const hexToRgba = (hex, alpha = 1) => {
    const normalized = (hex || "#d946ef").replace("#", "");
    const safeHex = normalized.length === 3
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

  const getEventStyle = (event) => {
    const category = getEventCategory(event);
    const hex = CATEGORY_HEX[category] || CATEGORY_HEX.default;

    return {
      backgroundColor: hexToRgba(hex, 0.1),
      borderColor: hexToRgba(hex, 0.3),
      borderLeftColor: hex,
      color: hex,
    };
  };

  // =========================================================
  // EVENT CLICK
  // =========================================================

  const handleEventClick = (
    event,
    clickEvent
  ) => {
    if (clickEvent) {
      clickEvent.stopPropagation();
    }

    if (onEventClick) {
      onEventClick(event);
    }
  };

  // =========================================================
  // DAY CLICK
  // =========================================================

  const handleDayClick = (day) => {
    if (!onSelectSlot) {
      return;
    }

    onSelectSlot({
      start: day,
      end: day,
    });
  };

  // =========================================================
  // MONTH EVENT
  // =========================================================

  const renderMonthEvent = (event) => {
    return (
      <button
        key={event.id}
        type="button"
        className="calendar-event"
        style={getEventStyle(event)}
        onClick={(e) =>
          handleEventClick(event, e)
        }
      >
        <div className="calendar-event-title">
          {event.title ||
            "Untitled Event"}
        </div>

        {event.start && (
          <div className="calendar-event-time">
            {formatEventTime(event)}
          </div>
        )}
      </button>
    );
  };

  // =========================================================
  // MONTH VIEW
  // =========================================================

  const renderMonthView = () => {
    return (
      <div className="calendar-month">

        {/* WEEKDAY HEADER */}

        <div className="calendar-weekday-row">
          {[
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
          ].map((day) => (
            <div
              key={day}
              className="calendar-weekday"
            >
              {day}
            </div>
          ))}
        </div>

        {/* DAYS */}

        <div className="calendar-month-grid">

          {monthDays.map((day) => {
            const dayEvents =
              getEventsForDay(day);

            // Maximum of 3 visible events
            const visibleEvents =
              dayEvents.slice(0, 3);

            const remainingCount =
              Math.max(
                dayEvents.length - 3,
                0
              );

            const isCurrentMonth =
              isSameMonth(
                day,
                currentDate
              );

            const today =
              isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={[
                  "calendar-day",

                  !isCurrentMonth
                    ? "outside-month"
                    : "",

                  today
                    ? "today"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}

                onClick={() =>
                  handleDayClick(day)
                }
              >

                {/* DAY NUMBER */}

                <div className="calendar-day-number">
                  {format(day, "dd")}
                </div>

                {/* TODAY */}

                {today && (
                  <div className="today-label">
                    TODAY
                  </div>
                )}

                {/* EVENTS */}

                <div className="calendar-day-events">

                  {visibleEvents.map(
                    renderMonthEvent
                  )}

                  {/* MORE */}

                  {remainingCount > 0 && (
                    <button
                      type="button"
                      className="calendar-more-button"

                      onClick={(e) => {
                        e.stopPropagation();

                        const hiddenEvent =
                          dayEvents[3];

                        if (
                          hiddenEvent &&
                          onEventClick
                        ) {
                          onEventClick(
                            hiddenEvent
                          );
                        }
                      }}
                    >
                      +{remainingCount} more
                    </button>
                  )}

                </div>

              </div>
            );
          })}

        </div>

      </div>
    );
  };

  // =========================================================
  // WEEK VIEW
  // =========================================================

  const renderWeekView = () => {
    return (
      <div className="calendar-week-view">

        <div className="calendar-week-grid">

          {weekDays.map((day) => {
            const dayEvents =
              getEventsForDay(day);

            const today =
              isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={[
                  "calendar-week-day",

                  today
                    ? "today"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >

                {/* HEADER */}

                <div className="calendar-week-day-header">

                  <span className="calendar-week-day-name">
                    {format(
                      day,
                      "EEEE"
                    )}
                  </span>

                  <span
                    className={[
                      "calendar-week-day-number",

                      today
                        ? "today-number"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {format(
                      day,
                      "MMM d"
                    )}
                  </span>

                </div>

                {/* EVENTS */}

                <div className="calendar-week-events">

                  {dayEvents.length === 0 ? (

                    <div className="calendar-week-empty">
                      No events
                    </div>

                  ) : (

                    dayEvents.map(
                      (event) => {
                        return (
                          <div
                            key={event.id}
                            className="calendar-week-event"
                            style={getEventStyle(event)}
                          >

                            <div className="calendar-week-event-title">
                              {event.title ||
                                "Untitled Event"}
                            </div>

                            <div className="calendar-week-event-info">

                              {formatEventTime(
                                event
                              )}

                              {event.client && (
                                <>
                                  {" "}
                                  •{" "}
                                  {
                                    event.client
                                  }
                                </>
                              )}

                            </div>

                            <button
                              type="button"
                              className="calendar-week-event-button"

                              onClick={(e) =>
                                handleEventClick(
                                  event,
                                  e
                                )
                              }
                            >
                              View event
                            </button>

                          </div>
                        );
                      }
                    )

                  )}

                </div>

              </div>
            );
          })}

        </div>

      </div>
    );
  };

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div className="calendar-wrapper">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="calendar-header">

        {/* LEFT */}

        <div className="calendar-header-left">

          <button
            type="button"
            className="calendar-nav-button"

            onClick={goPrevious}

            aria-label="Previous"
          >
            ←
          </button>

          <h2 className="calendar-title">
            {view === "month"
              ? monthTitle
              : weekTitle}
          </h2>

          <button
            type="button"
            className="calendar-nav-button"

            onClick={goNext}

            aria-label="Next"
          >
            →
          </button>

        </div>

        {/* RIGHT */}

        <div className="calendar-header-right">

          {/* VIEW SWITCHER */}

          <div className="calendar-view-switcher">

            <button
              type="button"

              className={
                view === "month"
                  ? "calendar-view-button active"
                  : "calendar-view-button"
              }

              onClick={() =>
                setView("month")
              }
            >
              Month
            </button>

            <button
              type="button"

              className={
                view === "week"
                  ? "calendar-view-button active"
                  : "calendar-view-button"
              }

              onClick={() =>
                setView("week")
              }
            >
              Week
            </button>

          </div>

          {/* TODAY */}

          <button
            type="button"
            className="calendar-today-button"

            onClick={goToday}
          >
            Today
          </button>

        </div>

      </div>

      {/* =====================================================
          CALENDAR CONTENT
          ===================================================== */}

      {view === "month"
        ? renderMonthView()
        : renderWeekView()}

    </div>
  );
}

export default Calendar;