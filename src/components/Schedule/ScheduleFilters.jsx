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
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
        />

      </div>

      {/* Category */}

      <div className="relative">

        <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full lg:w-52 appearance-none rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-8 text-slate-900 outline-none transition focus:border-sky-500 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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