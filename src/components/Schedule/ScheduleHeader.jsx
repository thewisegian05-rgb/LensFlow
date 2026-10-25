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
        className="add-client-btn text-sm font-semibold text-slate-950 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <FaPlus />

        New Event
      </button>

    </div>
  );
}

export default ScheduleHeader;