import {
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

function CalendarToolbar(toolbar) {
  const goToBack = () => toolbar.onNavigate("PREV");
  const goToNext = () => toolbar.onNavigate("NEXT");
  const goToToday = () => toolbar.onNavigate("TODAY");

  return (
    <div className="flex flex-col lg:flex-row justify-between items-center gap-5 mb-6">

      {/* Left */}

      <div className="flex items-center gap-3">

        <button
          onClick={goToBack}
          className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 hover:bg-sky-500 hover:text-slate-900 transition flex items-center justify-center text-white"
        >
          <FaChevronLeft />
        </button>

        <h2 className="text-2xl font-bold text-white min-w-[180px] text-center">
          {toolbar.label}
        </h2>

        <button
          onClick={goToNext}
          className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 hover:bg-sky-500 hover:text-slate-900 transition flex items-center justify-center text-white"
        >
          <FaChevronRight />
        </button>

      </div>

      {/* Right */}

      <div className="flex gap-3">

        <button
          onClick={goToToday}
          className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold transition"
        >
          Today
        </button>

      </div>

    </div>
  );
}

export default CalendarToolbar;