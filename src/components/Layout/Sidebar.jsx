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
} from "react-icons/fa";

import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function Sidebar() {
  const navigate = useNavigate();

  const linkStyle = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 transition-all border-l-4 ${
      isActive
        ? "border-sky-500 bg-sky-50 text-sky-600 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-400"
        : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error.message);
      return;
    }
    navigate("/");
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white/90 backdrop-blur-lg flex flex-col h-screen dark:border-slate-800 dark:bg-slate-900/90">

      {/* Logo */}

      <div className="p-6 border-b border-slate-200 dark:border-slate-800">

        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">

          <FaCameraRetro className="text-sky-500" />

          LensFlow

        </h1>

        <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
          Studio Management
        </p>

      </div>

      {/* Navigation */}

      <nav className="flex-1 overflow-y-auto py-4">

        <NavLink
          to="/dashboard"
          end
          className={linkStyle}
        >
          <FaHome />
          Dashboard
        </NavLink>

        <NavLink
          to="/dashboard/schedule"
          className={linkStyle}
        >
          <FaCalendarAlt />
          Schedule
        </NavLink>

        <NavLink
          to="/dashboard/workflow"
          className={linkStyle}
        >
          <FaTasks />
          Workflow
        </NavLink>

        <NavLink
          to="/dashboard/culling"
          className={linkStyle}
        >
          <FaCheckDouble />
          Culling
        </NavLink>

        <NavLink
          to="/dashboard/clients"
          className={linkStyle}
        >
          <FaUsers />
          Clients
        </NavLink>

        <NavLink
          to="/dashboard/storage"
          className={linkStyle}
        >
          <FaImages />
          Media Storage
        </NavLink>

      </nav>

      {/* Bottom */}

      <div className="border-t border-slate-200 dark:border-slate-800">

        <NavLink
          to="/dashboard/profile"
          className={linkStyle}
        >
          <FaUser />
          Profile
        </NavLink>

        <NavLink
          to="/dashboard/settings"
          className={linkStyle}
        >
          <FaCog />
          Settings
        </NavLink>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-6 py-3 text-left text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
        >
          <FaSignOutAlt />
          Sign Out
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;