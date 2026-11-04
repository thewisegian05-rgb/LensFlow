import { useCallback, useEffect, useRef, useState } from "react";
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

import { NavLink, useLocation, useNavigate } from "react-router-dom";
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

function AnimatedNavLinks({ links, onNavigate, className = "" }) {
  const location = useLocation();
  const navRef = useRef(null);
  const linkRefs = useRef({});
  const [indicator, setIndicator] = useState({
    top: 0,
    height: 0,
    visible: false,
  });

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const activeLink = links.find(({ to, end }) =>
      end
        ? location.pathname === to
        : location.pathname === to ||
          location.pathname.startsWith(`${to}/`)
    );

    const activeElement = activeLink
      ? linkRefs.current[activeLink.to]
      : null;

    if (!activeElement) {
      setIndicator((previous) => ({
        ...previous,
        visible: false,
      }));
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeElement.getBoundingClientRect();

    setIndicator({
      top: linkRect.top - navRect.top + nav.scrollTop,
      height: linkRect.height,
      visible: true,
    });
  }, [links, location.pathname]);

  useEffect(() => {
    updateIndicator();

    const nav = navRef.current;
    if (!nav) return;

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(nav);

    Object.values(linkRefs.current).forEach((element) => {
      if (element) resizeObserver.observe(element);
    });

    window.addEventListener("resize", updateIndicator);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <nav
      ref={navRef}
      className={`relative ${className}`}
    >
      {/* One shared highlight that slides between active links */}
      <span
        aria-hidden="true"
        className={`sidebar-sliding-highlight ${
          indicator.visible ? "is-visible" : ""
        }`}
        style={{
          height: `${indicator.height}px`,
          transform: `translateY(${indicator.top}px)`,
        }}
      />

      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          ref={(element) => {
            linkRefs.current[to] = element;
          }}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative z-10 flex items-center gap-3 border-l-4 px-6 py-3
             transition-colors duration-200
             ${
               isActive
                 ? "border-transparent text-sky-500 dark:text-sky-400"
                 : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
             }`
          }
        >
          <Icon className="shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar({ isOpen, onToggle, onClose }) {
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      onClose();
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out failed:", error.message);
      return;
    }

    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile / tablet backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-300 lg:hidden ${
          isOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-40 h-dvh shrink-0 overflow-hidden border-r border-slate-200 bg-white/90 backdrop-blur-lg transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 lg:static lg:z-auto ${
          isOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0"
        }`}
      >
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
              className="mt-1 rounded-md border-0 bg-transparent p-2 text-slate-500 shadow-none outline-none transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <FaChevronLeft />
            </button>
          </div>

          {/* Main navigation */}
          <AnimatedNavLinks
            links={mainLinks}
            onNavigate={handleNavClick}
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto py-4"
          />

          {/* Bottom navigation */}
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
            <AnimatedNavLinks
              links={bottomLinks}
              onNavigate={handleNavClick}
              className="py-2"
            />

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 border-0 bg-transparent px-6 py-3 text-left text-red-500 shadow-none outline-none transition hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-slate-800"
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