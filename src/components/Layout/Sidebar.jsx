import {
  FaCameraRetro,
  FaHome,
  FaCalendarAlt,
  FaTasks,
  FaCheckDouble,
  FaUsers,
  FaImages,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaChevronLeft,
} from "react-icons/fa";

import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard", icon: FaHome, end: true },
  { to: "/dashboard/schedule", label: "Schedule", icon: FaCalendarAlt },
  { to: "/dashboard/workflow", label: "Workflow", icon: FaTasks },
  { to: "/dashboard/culling", label: "Culling", icon: FaCheckDouble },
  { to: "/dashboard/clients", label: "Clients", icon: FaUsers },
  { to: "/dashboard/storage", label: "Media Storage", icon: FaImages },
];

const bottomLinks = [
  { to: "/dashboard/profile", label: "Profile", icon: FaUser },
  { to: "/dashboard/settings", label: "Settings", icon: FaCog },
];

function Sidebar({ isOpen, onToggle, onClose }) {
  const navigate = useNavigate();

  const linkStyle = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 transition-all border-l-4 ${
      isActive
        ? "border-sky-500 bg-sky-50 text-sky-600 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-400"
        : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  // Auto-close after navigating, but only on small screens (overlay mode)
  const handleNavClick = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) onClose();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error.message);
      return;
    }
    navigate("/");
  };

  const renderLink = ({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={linkStyle}
      onClick={handleNavClick}
    >
      <Icon />
      {label}
    </NavLink>
  );

  return (
    <>
      {/* Backdrop (mobile / tablet only) */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/*
        Mobile: fixed overlay that slides in/out.
        Desktop (lg+): sits in the layout flow and collapses its width to 0,
        so the main content expands to fill the space.
      */}
      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-40 h-screen shrink-0 overflow-hidden border-r border-slate-200 bg-white/90 backdrop-blur-lg transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 lg:static lg:z-auto ${
          isOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0"
        }`}
      >
        {/* Fixed-width inner wrapper so content doesn't squish while collapsing */}
        <div className="flex h-full w-64 flex-col">
          {/* Logo */}
          <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <FaCameraRetro className="text-sky-500" />
                LensFlow
              </h1>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
                Studio Management
              </p>
            </div>

            <button
              onClick={onToggle}
              aria-label="Hide sidebar"
              className="mt-1 !border-0 !outline-none !shadow-none rounded-md bg-transparent p-2 text-slate-500 transition hover:!border-0 hover:bg-slate-100 hover:text-slate-900 focus:!outline-none focus:!ring-0 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <FaChevronLeft />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {mainLinks.map(renderLink)}
          </nav>

          {/* Bottom */}
          <div className="border-t border-slate-200 dark:border-slate-800">
            {bottomLinks.map(renderLink)}

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-none border-transparent px-6 py-3 text-left text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-slate-800"
              style={{ color: "#ef4444" }}
            >
              <FaSignOutAlt />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;