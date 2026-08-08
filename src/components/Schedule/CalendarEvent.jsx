function CalendarEvent({ event }) {
  const category = event.category || "Other";

  const categoryStyles = {
    Wedding: "bg-red-500/20 text-red-400 border-red-500/30",
    Prenup: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Portrait: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    Corporate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Birthday: "bg-green-500/20 text-green-400 border-green-500/30",
    Other: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };

  return (
    <div
      className={`
        ${categoryStyles[category] || categoryStyles.Other}
        border
        rounded-md
        px-2
        py-1
        leading-tight
        overflow-hidden
        transition
        hover:brightness-125
      `}
    >
      <div className="font-semibold text-[11px] truncate">
        {event.title}
      </div>

      {event.start && (
        <div className="text-[9px] opacity-80 truncate">
          {event.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}

export default CalendarEvent;