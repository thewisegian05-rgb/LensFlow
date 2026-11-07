import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaCameraRetro,
  FaHome,
  FaCalendarAlt,
  FaTasks,
  FaCheckDouble,
  FaUsers,
  FaImages,
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
  { to: "/dashboard/settings", label: "Settings", icon: FaCog },
];

// Names are saved in Supabase Auth metadata by SignUpPage.jsx.
// Use the name from registration instead of the public studio username.
function getPhotographerIdentity(user) {
  const metadata = user?.user_metadata || {};
  const registrationName = [
    metadata.first_name,
    metadata.middle_name,
    metadata.last_name,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ");

  const name =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    registrationName ||
    user?.email?.split("@")[0] ||
    "Photographer";

  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = [words[0], words.length > 1 ? words[words.length - 1] : null]
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return {
    name,
    initials: initials || "P",
    subtitle:
      metadata.account_type === "both"
        ? "Photographer & Customer"
        : "Photographer",
  };
}

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
      setIndicator((previous) => ({ ...previous, visible: false }));
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
    <nav ref={navRef} className={`relative w-full ${className}`}>
      {/* Full-width sliding highlight, including the left blue accent */}
      <span
        aria-hidden="true"
        className={`sidebar-sliding-highlight ${
          indicator.visible ? "is-visible" : ""
        }`}
        style={{
          left: 0,
          right: 0,
          width: "100%",
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
  const [photographer, setPhotographer] = useState(() =>
    getPhotographerIdentity(null)
  );

  // Get the name submitted during photographer registration.
  // Keep it up to date when the session changes.
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) console.error("Could not load sidebar identity:", error);
      setPhotographer(getPhotographerIdentity(data?.user));
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setPhotographer(getPhotographerIdentity(session?.user));
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleNavClick = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      onClose();
    }
  };

  const handleLogoClick = () => {
    navigate("/dashboard");
    handleNavClick();
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
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
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
        <style>{`
          .sidebar-nav-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .sidebar-nav-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex h-full w-64 flex-col">
          {/* Clickable Logo / Home */}
          <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogoClick}
              aria-label="Go to LensFlow home"
              className="group border-0 bg-transparent p-0 text-left shadow-none outline-none"
            >
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 transition-colors group-hover:text-sky-500 dark:text-white dark:group-hover:text-sky-400">
                <FaCameraRetro className="lf-lens text-sky-500" />
                LensFlow
              </h1>
              <p className="mt-1 text-xs text-slate-600 transition-colors group-hover:text-sky-500 dark:text-slate-500 dark:group-hover:text-sky-400">
                Studio Management
              </p>
            </button>

            <button
              type="button"
              onClick={onToggle}
              aria-label="Hide sidebar"
              className="mt-1 rounded-md border-0 bg-transparent p-2 text-slate-500 shadow-none outline-none transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <FaChevronLeft />
            </button>
          </div>

          {/* Account shortcut below the LensFlow header. */}
          <div className="shrink-0 border-b border-slate-200 py-3 dark:border-slate-800">
            {/* Profile account row: uses registration full_name, not Profile.username */}
            <NavLink
              to="/dashboard/profile"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `group relative flex w-full items-center gap-3 border-l-4 px-5 py-3.5 text-left transition-colors duration-200 ${
                  isActive
                    ? "border-sky-500 bg-sky-500/15 dark:bg-sky-500/15"
                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sm font-semibold text-sky-700 ring-1 ring-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300">
                {photographer.initials}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400" title={photographer.name}>
                  {photographer.name}
                </span>
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {photographer.subtitle}
                </span>
              </span>
            </NavLink>

          </div>

          {/* Main navigation. Keep scrolling, but don't reserve a scrollbar strip. */}
          <AnimatedNavLinks
            links={mainLinks}
            onNavigate={handleNavClick}
            className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4"
          />

          {/* Bottom actions */}
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">

            <AnimatedNavLinks
              links={bottomLinks}
              onNavigate={handleNavClick}
              className="py-1"
            />

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 border-0 bg-transparent px-6 py-3 text-left text-red-500 shadow-none transition hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-slate-800"
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
