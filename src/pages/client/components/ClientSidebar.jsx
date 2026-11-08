
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useClientNav } from "../utils/clientRoutes";

import {
  FaCameraRetro,
  FaHome,
  FaRegImage,
  FaCalendarAlt,
  FaFileAlt,
  FaHeart,
  FaCommentDots,
  FaSignOutAlt,
  FaUserCircle,
  FaCog,
} from "react-icons/fa";

// Keep exported for other components.
export const NAV_ITEMS = [
  { id: "home", label: "Home", icon: FaHome },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: FaRegImage,
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: FaCalendarAlt,
  },
  {
    id: "bookings",
    label: "My Bookings",
    icon: FaFileAlt,
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: FaHeart,
  },
  {
    id: "messages",
    label: "Messages",
    icon: FaCommentDots,
  },
];

const HIDDEN_IN_SIDEBAR = [
  "messages",
  "bookings",
];

const SIDEBAR_ITEMS = NAV_ITEMS.filter(
  (item) => !HIDDEN_IN_SIDEBAR.includes(item.id)
);

const FOOTER_ITEMS = [
  {
    id: "profile",
    label: "Profile",
    icon: FaUserCircle,
  },
  {
    id: "settings",
    label: "Settings",
    icon: FaCog,
  },
];

// ==========================================
// NAVIGATION LINK
// ==========================================

function SidebarLink({
  id,
  label,
  icon: Icon,
  active,
  to,
  mobileOnly = false,
  footer = false,
}) {
  return (
    <Link
      to={to}
      data-tab={id}
      aria-current={active ? "page" : undefined}
      className={`
        group relative flex w-full
        shrink-0 items-center gap-3

        border-l-4
        px-5 py-3
        text-left text-sm font-medium

        transition-all duration-200
        ease-out

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-inset
        focus-visible:ring-sky-500

        ${mobileOnly ? "lg:hidden" : ""}

        ${footer ? "lg:px-6" : ""}

        ${
          active
            ? `
              border-sky-500
              bg-sky-50
              text-sky-700

              dark:border-sky-500
              dark:bg-sky-500/15
              dark:text-white
            `
            : `
              border-transparent
              text-slate-600

              hover:bg-slate-100
              hover:text-slate-900

              dark:text-slate-300
              dark:hover:bg-slate-800/70
              dark:hover:text-white
            `
        }
      `}
    >
      <Icon
        className={`
          shrink-0 text-base
          transition-colors duration-200

          ${
            active
              ? "text-sky-500"
              : `
                text-slate-500
                group-hover:text-sky-500

                dark:text-slate-400
                dark:group-hover:text-sky-400
              `
          }
        `}
        aria-hidden="true"
      />

      <span className="whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

// ==========================================
// CLIENT SIDEBAR
// ==========================================

export default function ClientSidebar({
  onSignOut,
}) {
  const { tabUrl, queryMode } = useClientNav();

  const location = useLocation();
  const { pathname, search } = location;

  const current = queryMode
    ? new URLSearchParams(search).get("tab") ||
      "home"
    : pathname.split("/").filter(Boolean).pop() ||
      "home";

  const allTabs = [
    ...NAV_ITEMS,
    ...FOOTER_ITEMS,
  ];

  const activeTab = allTabs.some(
    (item) => item.id === current
  )
    ? current
    : "home";

  const navRef = useRef(null);

  // Keep the selected mobile tab in view.
  useEffect(() => {
    const nav = navRef.current;

    if (!nav) return;

    const item = nav.querySelector(
      `[data-tab="${activeTab}"]`
    );

    if (!item || item.offsetWidth === 0) {
      return;
    }

    if (nav.scrollWidth > nav.clientWidth + 4) {
      nav.scrollTo({
        left: Math.max(
          0,
          item.offsetLeft -
            nav.clientWidth / 2 +
            item.offsetWidth / 2
        ),
        behavior: "smooth",
      });
    }
  }, [activeTab]);

  return (
    <aside
      className="
        relative z-20 flex
        w-full flex-col

        border-b border-slate-200
        bg-white text-slate-900

        transition-colors duration-300

        lg:fixed lg:inset-y-0
        lg:left-0 lg:h-screen
        lg:w-64 lg:border-b-0
        lg:border-r lg:shadow-sm

        dark:border-slate-800
        dark:bg-[#0B1120]
        dark:text-slate-100
        dark:lg:shadow-none
      "
    >
      {/* ======================================
          LOGO HEADER
         ====================================== */}

      <div
        className="
          border-b border-slate-200
          px-5 py-6

          dark:border-slate-800
        "
      >
        <Link
          to={tabUrl("home")}
          aria-label="Go to Client Portal home"
          className="
            group flex items-center gap-3
            rounded-lg outline-none

            focus-visible:ring-2
            focus-visible:ring-sky-500
          "
        >
          <FaCameraRetro
            className="
              lf-lens shrink-0
              text-2xl text-sky-500
            "
          />

          <div className="min-w-0">
            <h1
              className="
                text-xl font-bold
                tracking-tight
                text-slate-900

                transition-colors
                group-hover:text-sky-600

                dark:text-white
                dark:group-hover:text-sky-400
              "
            >
              LensFlow
            </h1>

            <p
              className="
                text-xs text-slate-500

                transition-colors
                group-hover:text-sky-600

                dark:text-slate-400
                dark:group-hover:text-sky-400
              "
            >
              Client Portal
            </p>
          </div>
        </Link>
      </div>

      {/* ======================================
          MAIN NAVIGATION
         ====================================== */}

      <nav
        ref={navRef}
        aria-label="Client portal navigation"
        className="
          flex min-w-0 gap-1
          overflow-x-auto py-4

          lg:flex-1 lg:flex-col
          lg:gap-2 lg:overflow-y-auto
          lg:overflow-x-hidden
        "
      >
        {SIDEBAR_ITEMS.map(
          ({ id, label, icon }) => (
            <SidebarLink
              key={id}
              id={id}
              label={label}
              icon={icon}
              to={tabUrl(id)}
              active={activeTab === id}
            />
          )
        )}

        {/* Profile + Settings on mobile */}
        {FOOTER_ITEMS.map(
          ({ id, label, icon }) => (
            <SidebarLink
              key={`mobile-${id}`}
              id={id}
              label={label}
              icon={icon}
              to={tabUrl(id)}
              active={activeTab === id}
              mobileOnly
            />
          )
        )}
      </nav>

      {/* ======================================
          DESKTOP FOOTER
         ====================================== */}

      <div
        className="
          mt-auto hidden
          border-t border-slate-200

          lg:block

          dark:border-slate-800
        "
      >
        {FOOTER_ITEMS.map(
          ({ id, label, icon }) => (
            <SidebarLink
              key={id}
              id={id}
              label={label}
              icon={icon}
              to={tabUrl(id)}
              active={activeTab === id}
              footer
            />
          )
        )}

        {/* SIGN OUT */}
        <button
          type="button"
          onClick={onSignOut}
          className="
            group flex w-full
            items-center gap-3

            border-l-4
            border-transparent
            px-6 py-3

            text-left text-sm
            font-medium text-rose-600

            transition-colors duration-200

            hover:bg-rose-50
            hover:text-rose-700

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-inset
            focus-visible:ring-rose-500

            dark:text-rose-400
            dark:hover:bg-rose-500/10
            dark:hover:text-rose-300
          "
        >
          <FaSignOutAlt
            className="
              shrink-0 text-base
            "
            aria-hidden="true"
          />

          <span>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
