function CalendarToolbar({
  label,
  currentView,
  onNavigate,
  onView,
}) {
  return (
    <div className="calendar-toolbar">

      {/* LEFT */}
      <div className="calendar-toolbar-left">

        <button
          type="button"
          onClick={() => onNavigate("PREV")}
          className="calendar-nav-button"
        >
          ←
        </button>

        <h2 className="calendar-month">
          {label}
        </h2>

        <button
          type="button"
          onClick={() => onNavigate("NEXT")}
          className="calendar-nav-button"
        >
          →
        </button>

      </div>


      {/* CENTER */}
      <div className="calendar-view-switcher">

        <button
          type="button"
          onClick={() => onView("month")}
          className={`calendar-view-button ${
            currentView === "month"
              ? "active"
              : ""
          }`}
        >
          Month
        </button>

        <button
          type="button"
          onClick={() => onView("week")}
          className={`calendar-view-button ${
            currentView === "week"
              ? "active"
              : ""
          }`}
        >
          Week
        </button>

      </div>


      {/* RIGHT */}
      <button
        type="button"
        onClick={() => onNavigate("TODAY")}
        className="calendar-today-button"
      >
        Today
      </button>

    </div>
  );
}

export default CalendarToolbar;