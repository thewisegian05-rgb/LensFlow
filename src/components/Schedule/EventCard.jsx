function EventCard({ event }) {
  const colors = {
    Wedding: "bg-pink-500",
    Portrait: "bg-sky-500",
    Corporate: "bg-green-500",
    Birthday: "bg-yellow-500",
    Other: "bg-purple-500",
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
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
          className={`px-2 py-1 rounded text-xs text-white ${
            colors[event.type] || colors.Other
          }`}
        >
          {event.type}
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