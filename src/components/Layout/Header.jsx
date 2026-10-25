import { useEffect, useRef, useState } from "react";
import { FaBars, FaSearch, FaTimes } from "react-icons/fa";

import NotificationBell from "./NotificationBell";
import NewProjectButton from "./NewProjectButton";

const searchInputStyle =
  "w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

function Header({ sidebarOpen, onMenuClick }) {
  // Only used on small screens, where the search bar is collapsed to an icon
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileSearchRef = useRef(null);

  // Focus the input when the mobile search bar opens
  useEffect(() => {
    if (searchOpen) mobileSearchRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/80">

      {/* Left */}

      <div className="flex items-center sm:gap-4">

        {/* Menu button: slides in when the sidebar is hidden */}

        <div
          className={`overflow-hidden transition-all duration-300 ${
            sidebarOpen
              ? "pointer-events-none mr-0 w-0 opacity-0"
              : "mr-3 w-6 opacity-100 sm:mr-0"
          }`}
        >
          <button
            onClick={onMenuClick}
            aria-label="Show sidebar"
            tabIndex={sidebarOpen ? -1 : 0}
            className={`!border-0 !outline-none !shadow-none rounded-md bg-transparent p-1 text-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-transform duration-300 ${
              sidebarOpen ? "-rotate-90 scale-75" : "rotate-0 scale-100"
            }`}
          >
            <FaBars />
          </button>
        </div>

        {/* Search (sm and up) */}

        <div className="relative hidden sm:block">

          <FaSearch className="absolute left-3 top-3 text-slate-500 text-sm" />

          <input
            type="text"
            placeholder="Search clients, projects..."
            className={`${searchInputStyle} w-64`}
          />

        </div>

      </div>

      {/* Right */}

      <div className="flex items-center gap-3 sm:gap-4">

        {/* Search icon (small screens only) */}

        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Open search"
          className="p-1 text-lg text-slate-600 hover:text-slate-900 sm:hidden dark:text-slate-400 dark:hover:text-white"
        >
          <FaSearch />
        </button>

        {/* Notification */}

        <NotificationBell />

        {/* New Project */}

        <NewProjectButton />

      </div>

      {/* Expanded search bar (small screens only), covers the header */}

      <div
        aria-hidden={!searchOpen}
        className={`absolute inset-0 flex items-center gap-3 bg-white px-3 transition-all duration-200 sm:hidden dark:bg-slate-900 ${
          searchOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >

        <div className="relative flex-1">

          <FaSearch className="absolute left-3 top-3 text-slate-500 text-sm" />

          <input
            ref={mobileSearchRef}
            type="text"
            placeholder="Search clients, projects..."
            tabIndex={searchOpen ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation(); // don't also close the sidebar
                setSearchOpen(false);
              }
            }}
            className={searchInputStyle}
          />

        </div>

        <button
          onClick={() => setSearchOpen(false)}
          aria-label="Close search"
          tabIndex={searchOpen ? 0 : -1}
          className="p-1 text-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <FaTimes />
        </button>

      </div>

    </header>
  );
}

export default Header;