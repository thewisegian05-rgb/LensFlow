import {
  FaBars,
  FaBell,
  FaPlus,
  FaSearch,
} from "react-icons/fa";

function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md p-3 sm:p-4">

      {/* Left */}

      <div className="flex items-center gap-3 sm:gap-4">

        {/* Mobile Menu */}

        <button className="text-slate-400 hover:text-white text-xl md:hidden">
          <FaBars />
        </button>

        {/* Search */}

        <div className="relative hidden sm:block">

          <FaSearch className="absolute left-3 top-3 text-slate-500 text-sm" />

          <input
            type="text"
            placeholder="Search clients, projects..."
            className="w-64 rounded-full bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-300 outline-none transition focus:ring-2 focus:ring-sky-500"
          />

        </div>

      </div>

      {/* Right */}

      <div className="flex items-center gap-3 sm:gap-4">

        {/* Notification */}

        <button className="relative p-2 text-slate-400 transition hover:text-white">

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