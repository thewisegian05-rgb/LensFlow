import { FaClock } from "react-icons/fa";

function TodaySchedule() {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 sm:p-5">
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
        Today's Schedule
      </h3>

      <div className="space-y-4">
        <div className="flex gap-4 items-start">
          <div className="flex flex-col items-center justify-center bg-sky-500/10 text-sky-500 w-12 h-12 rounded-lg flex-shrink-0">
            <span className="text-xs font-bold">
              OCT
            </span>

            <span className="text-lg font-bold leading-none">
              24
            </span>
          </div>

          <div>
            <h4 className="text-white font-medium text-sm">
              Smith Wedding Ceremony
            </h4>

            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <FaClock />
              02:00 PM - 06:00 PM
            </p>

            <span className="inline-block mt-2 bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
              Wedding
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TodaySchedule;