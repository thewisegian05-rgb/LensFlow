import { FaSearch, FaFilter } from "react-icons/fa";

function ScheduleFilters({
  search,
  setSearch,
  category,
  setCategory,
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 mb-5">

      {/* Search */}

      <div className="relative flex-1">

        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />

        <input
          type="text"
          placeholder="Search events or clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none focus:border-sky-500 transition"
        />

      </div>

      {/* Category */}

      <div className="relative">

        <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full lg:w-52 appearance-none bg-slate-900 border border-slate-700 rounded-lg py-3 pl-11 pr-8 text-white outline-none focus:border-sky-500 transition cursor-pointer"
        >
          <option value="All">
            All Categories
          </option>

          <option value="Wedding">
            Wedding
          </option>

          <option value="Prenup">
            Prenup
          </option>

          <option value="Portrait">
            Portrait
          </option>

          <option value="Corporate">
            Corporate
          </option>

          <option value="Birthday">
            Birthday
          </option>

        </select>

      </div>

    </div>
  );
}

export default ScheduleFilters;