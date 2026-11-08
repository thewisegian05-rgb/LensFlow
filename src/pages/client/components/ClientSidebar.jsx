import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
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

// Keep exported for components that use these navigation items.
export const NAV_ITEMS = [
  { id: "home", label: "Home", icon: FaHome },
  { id: "portfolio", label: "Portfolio", icon: FaRegImage },
  { id: "schedule", label: "Schedule", icon: FaCalendarAlt },
  { id: "bookings", label: "My Bookings", icon: FaFileAlt },
  { id: "reviews", label: "Reviews", icon: FaHeart },
  { id: "messages", label: "Messages", icon: FaCommentDots },
];

// These are available through other parts of the portal, not the sidebar.
const HIDDEN_IN_SIDEBAR = ["messages", "bookings"];
const MAIN_ITEMS = NAV_ITEMS.filter(
  (item) => !HIDDEN_IN_SIDEBAR.includes(item.id)
);

const PROFILE_ITEM = {
  id: "profile",
  label: "Profile",
  icon: FaUserCircle,
};

const SETTINGS_ITEM = {
  id: "settings",
  label: "Settings",
  icon: FaCog,
};

const MOBILE_ITEMS = [...MAIN_ITEMS, PROFILE_ITEM, SETTINGS_ITEM];
const FOOTER_ITEMS = [SETTINGS_ITEM];
const ALL_TAB_IDS = new Set([
  ...NAV_ITEMS,
  PROFILE_ITEM,
  SETTINGS_ITEM,
].map((item) => item.id));

function getClientIdentity(user) {
  const metadata = user?.user_metadata || {};

  const registeredName = [
    metadata.first_name,
    metadata.middle_name,
    metadata.last_name,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ");

  const name =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    registeredName ||
    user?.email?.split("@")[0] ||
    "Client";

  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = [words[0], words.length > 1 ? words[words.length - 1] : null]
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return {
    name,
    initials: initials || "C",
    subtitle:
      metadata.account_type === "both"
        ? "Photographer & Customer"
        : "Client",
    avatarUrl:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : "",
  };
}

/**
 * One animated indicator per navigation group, just like the Admin sidebar.
 * Reuses the shared index.css highlight and scrollbar styles.
 * Horizontal on mobile, vertical on desktop.
 */
function SlidingNav({
  items,
  activeTab,
  tabUrl,
  direction = "vertical",
  className = "",
  label,
}) {
  const navRef = useRef(null);
  const linkRefs = useRef({});
  const [indicator, setIndicator] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    const link = linkRefs.current[activeTab];

    if (!nav || !link || link.getClientRects().length === 0) {
      setIndicator((prev) =>
        prev.visible ? { ...prev, visible: false } : prev
      );
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const next = {
      x: Math.round(linkRect.left - navRect.left + nav.scrollLeft),
      y: Math.round(linkRect.top - navRect.top + nav.scrollTop),
      width: Math.round(linkRect.width),
      height: Math.round(linkRect.height),
      visible: true,
    };

    setIndicator((prev) =>
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height &&
      prev.visible === next.visible
        ? prev
        : next
    );
  }, [activeTab]);

  // Measure the selected link as soon as navigation changes.
  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // Keep the highlight aligned when the sidebar or window changes size.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateIndicator)
        : null;

    observer?.observe(nav);
    Object.values(linkRefs.current).forEach((link) => {
      if (link) observer?.observe(link);
    });

    window.addEventListener("resize", updateIndicator);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  // Retain the previous mobile behavior: selected tabs scroll into view.
  useEffect(() => {
    if (direction !== "horizontal") return;
    const nav = navRef.current;
    const link = linkRefs.current[activeTab];
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth + 4) return;

    nav.scrollTo({
      left: Math.max(
        0,
        link.offsetLeft - nav.clientWidth / 2 + link.offsetWidth / 2
      ),
      behavior: "smooth",
    });
  }, [activeTab, direction]);

  const horizontal = direction === "horizontal";

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={`sidebar-nav-scroll relative min-w-0 ${className}`}
    >
      {/* Reuse the same sliding highlight from index.css as the Admin sidebar. */}
      <span
        aria-hidden="true"
        className={`sidebar-sliding-highlight ${
          indicator.visible ? "is-visible" : ""
        }`}
        style={
          horizontal
            ? {
                // The shared CSS draws a vertical accent by default.
                // On mobile, use a horizontal indicator instead.
                left: 0,
                right: "auto",
                width: `${indicator.width}px`,
                height: `${indicator.height}px`,
                transform: `translateX(${indicator.x}px)`,
                borderLeft: "none",
                borderBottom: "4px solid #0ea5e9",
                transition:
                  "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms ease, height 220ms ease, opacity 150ms ease",
              }
            : {
                width: "100%",
                height: `${indicator.height}px`,
                transform: `translateY(${indicator.y}px)`,
              }
        }
      />

      {items.map(({ id, label: itemLabel, icon: Icon }) => {
        const active = activeTab === id;

        return (
          <Link
            key={id}
            ref={(element) => {
              linkRefs.current[id] = element;
            }}
            to={tabUrl(id)}
            data-tab={id}
            aria-current={active ? "page" : undefined}
            className={`
              group relative z-10 flex shrink-0 items-center gap-3
              border-l-4 border-transparent text-sm font-medium
              transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-inset focus-visible:ring-sky-500
              ${horizontal ? "px-4 py-3" : "w-full px-5 py-3.5"}
              ${
                active
                  ? "text-sky-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }
            `}
          >
            <Icon
              className={`shrink-0 text-base transition-colors duration-200 ${
                active
                  ? "text-sky-500"
                  : "text-slate-500 group-hover:text-sky-500 dark:text-slate-400 dark:group-hover:text-sky-400"
              }`}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">{itemLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function ClientSidebar({ onSignOut }) {
  const { tabUrl, current } = useClientNav();
  const activeTab = ALL_TAB_IDS.has(current) ? current : "home";

  const [client, setClient] = useState(() => getClientIdentity(null));
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadClient = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) console.error("Could not load client sidebar identity:", error);
      setClient(getClientIdentity(data?.user));
    };

    loadClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setClient(getClientIdentity(session?.user));
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showAvatar = client.avatarUrl && failedAvatarUrl !== client.avatarUrl;

  return (
    <aside
      className="
        relative z-20 flex w-full flex-col
        border-b border-slate-200 bg-white text-slate-900
        transition-colors duration-300
        lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:w-64
        lg:border-b-0 lg:border-r lg:shadow-sm
        dark:border-slate-800 dark:bg-[#0B1120]
        dark:text-slate-100 dark:lg:shadow-none
      "
    >
      {/* LOGO */}
      <div className="shrink-0 border-b border-slate-200 px-5 py-6 dark:border-slate-800">
        <Link
          to={tabUrl("home")}
          aria-label="Go to Client Portal home"
          className="group flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <FaCameraRetro className="lf-lens shrink-0 text-2xl text-sky-500" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
              LensFlow
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Client Portal
            </p>
          </div>
        </Link>
      </div>

      {/* PROFILE SHORTCUT: same position and layout as Admin sidebar. */}
      <div className="hidden shrink-0 border-b border-slate-200 py-3 lg:block dark:border-slate-800">
        <Link
          to={tabUrl("profile")}
          aria-current={activeTab === "profile" ? "page" : undefined}
          className={`
            group relative flex w-full items-center gap-3
            border-l-4 px-5 py-3.5 text-left
            transition-colors duration-200
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-inset focus-visible:ring-sky-500
            ${
              activeTab === "profile"
                ? "border-sky-500 bg-sky-100 dark:bg-sky-500/15"
                : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70"
            }
          `}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-500/15 text-sm font-semibold text-sky-700 ring-1 ring-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300">
            {showAvatar ? (
              <img
                src={client.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setFailedAvatarUrl(client.avatarUrl)}
              />
            ) : (
              client.initials
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400"
              title={client.name}
            >
              {client.name}
            </span>
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {client.subtitle}
            </span>
          </span>
        </Link>
      </div>

      {/* MOBILE: preserve horizontal navigation, including Profile/Settings. */}
      <SlidingNav
        items={MOBILE_ITEMS}
        activeTab={activeTab}
        tabUrl={tabUrl}
        direction="horizontal"
        label="Client portal mobile navigation"
        className="flex w-full gap-1 overflow-x-auto overflow-y-hidden py-2 lg:hidden"
      />

      {/* DESKTOP: sliding highlight, same behavior as Admin sidebar. */}
      <SlidingNav
        items={MAIN_ITEMS}
        activeTab={activeTab}
        tabUrl={tabUrl}
        label="Client portal navigation"
        className="hidden min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-4 lg:flex"
      />

      {/* DESKTOP FOOTER: Settings and Sign Out. Profile lives under the logo. */}
      <div className="mt-auto hidden shrink-0 border-t border-slate-200 lg:block dark:border-slate-800">
        <SlidingNav
          items={FOOTER_ITEMS}
          activeTab={activeTab}
          tabUrl={tabUrl}
          label="Client portal settings navigation"
          className="flex flex-col py-1"
        />

        <button
          type="button"
          onClick={onSignOut}
          className="
            group flex w-full items-center gap-3 border-0
            !bg-transparent px-6 py-3 text-left text-sm font-medium
            text-rose-600 shadow-none transition-colors duration-200
            hover:!bg-rose-50 hover:text-rose-700
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-inset focus-visible:ring-rose-500
            dark:text-rose-400 dark:hover:!bg-rose-500/10
            dark:hover:text-rose-300
          "
        >
          <FaSignOutAlt className="shrink-0 text-base" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
