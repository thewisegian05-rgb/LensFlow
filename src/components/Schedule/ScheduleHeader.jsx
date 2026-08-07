import { FaPlus } from "react-icons/fa";

function ScheduleHeader({ onAdd }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

      <div>
        <h1 className="text-3xl font-bold text-white">
          Schedule Manager
        </h1>

        <p className="text-slate-400 mt-1">
          Manage studio bookings and appointments.
        </p>
      </div>

      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold px-5 py-3 rounded-lg transition"
      >
        <FaPlus />

        New Event
      </button>

    </div>
  );
}

export default ScheduleHeader;