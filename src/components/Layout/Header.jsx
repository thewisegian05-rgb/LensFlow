import {
  FaBars,
  FaBell,
  FaPlus,
  FaSearch,
} from "react-icons/fa";

function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/80">

      {/* Left */}

      <div className="flex items-center gap-3 sm:gap-4">

        {/* Mobile Menu */}

        <button className="text-slate-600 hover:text-slate-900 text-xl md:hidden dark:text-slate-400 dark:hover:text-white">
          <FaBars />
        </button>

        {/* Search */}

        <div className="relative hidden sm:block">

          <FaSearch className="absolute left-3 top-3 text-slate-500 text-sm" />

          <input
            type="text"
            placeholder="Search clients, projects..."
            className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />

        </div>

      </div>

      {/* Right */}

      <div className="flex items-center gap-3 sm:gap-4">

        {/* Notification */}

        <button className="relative p-2 text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">

          <FaBell className="text-lg" />

          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sky-500"></span>

        </button>

        {/* New Project */}

        <button className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-600 sm:px-4">

          <FaPlus />

          <span className="hidden sm:inline">
            New Project
          </span>

        </button>

      </div>

    </header>
  );
}

export default Header;