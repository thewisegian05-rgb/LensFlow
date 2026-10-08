import {
  FaCameraRetro,
  FaHome,
  FaCalendarAlt,
  FaTasks,
  FaUsers,
  FaImages,
  FaCut,
  FaUser,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";

function Sidebar() {
  const linkStyle = ({ isActive }) =>
    `flex items-center gap-3 px-6 py-3 transition-all duration-200 border-l-4 hover:pl-8 ${
      isActive
        ? "border-sky-500 bg-sky-500/10 text-sky-400"
        : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-lg border-r border-slate-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <FaCameraRetro className="text-sky-500" />
          LensFlow
        </h1>
        <p className="mt-1 text-xs text-slate-500">Studio Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <NavLink to="/dashboard" end className={linkStyle}>
          <FaHome />
          Dashboard
        </NavLink>

        <NavLink to="/dashboard/schedule" className={linkStyle}>
          <FaCalendarAlt />
          Schedule
        </NavLink>

        <NavLink to="/dashboard/workflow" className={linkStyle}>
          <FaTasks />
          Workflow
        </NavLink>

        <NavLink to="/dashboard/culling" className={linkStyle}>
          <FaCut />
          Culling
        </NavLink>

        <NavLink to="/dashboard/clients" className={linkStyle}>
          <FaUsers />
          Clients
        </NavLink>

        <NavLink to="/dashboard/storage" className={linkStyle}>
          <FaImages />
          Media Storage
        </NavLink>
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800">
        <NavLink to="/dashboard/profile" className={linkStyle}>
          <FaUser />
          Profile
        </NavLink>

        <NavLink to="/dashboard/settings" className={linkStyle}>
          <FaCog />
          Settings
        </NavLink>

        <button className="flex w-full items-center gap-3 px-6 py-3 text-left text-red-400 transition hover:bg-slate-800">
          <FaSignOutAlt />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;