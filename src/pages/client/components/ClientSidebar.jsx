import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useClientNav } from "../utils/clientRoutes";
import {
  FaCameraRetro,
  FaHome,
  FaRegImage,
  FaCalendarAlt,
  FaFileAlt,
  FaHeart,
  FaSignOutAlt,
} from "react-icons/fa";

export const NAV_ITEMS = [
  { id: "home",      label: "Home",        icon: FaHome },
  { id: "portfolio", label: "Portfolio",   icon: FaRegImage },
  { id: "schedule",  label: "Schedule",    icon: FaCalendarAlt },
  { id: "bookings",  label: "My Bookings", icon: FaFileAlt },
  { id: "reviews",   label: "Reviews",     icon: FaHeart },
];

export default function ClientSidebar({ onSignOut }) {
  const { tabUrl, queryMode } = useClientNav();
  const location = useLocation();
  const { pathname, search } = location;

  const current = queryMode
    ? new URLSearchParams(search).get("tab") || "home"
    : pathname.split("/").filter(Boolean).pop() || "home";

  const activeTab = NAV_ITEMS.some((i) => i.id === current) ? current : "home";

  const navRef = useRef(null);
  const [ind, setInd] = useState({ x: 0, y: 0, w: 0, h: 0, ready: false, animate: false });

  // Re-run whenever location changes (covers both path and query-string changes)
  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const el = nav?.querySelector(`[data-tab="${activeTab}"]`);
      if (!el) return;
      setInd((p) => ({
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
        ready: true,
        animate: p.ready,
      }));
      if (nav.scrollWidth > nav.clientWidth + 4) {
        nav.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: "smooth" });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  // KEY FIX: depend on the full location object, not just activeTab
  }, [activeTab, location]);

  return (
    <aside className="border-b border-slate-800 bg-[#0B1120] lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:border-slate-800 lg:bg-slate-900/90 lg:backdrop-blur-lg">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-6">
        <FaCameraRetro className="lf-lens text-2xl text-sky-500" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">LensFlow</h1>
          <p className="text-xs text-slate-300">Client Portal</p>
        </div>
      </div>

      <nav
        ref={navRef}
        className="relative flex gap-1 overflow-x-auto py-4 lg:flex-col lg:gap-2"
        aria-label="Client portal navigation"
      >
        <span
          aria-hidden="true"
          className={`lf-nav-indicator ${ind.animate ? "" : "no-anim"}`}
          style={{
            width: ind.w,
            height: ind.h,
            opacity: ind.ready ? 1 : 0,
            transform: `translate(${ind.x}px, ${ind.y}px)`,
          }}
        />
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const on = activeTab === id;
          return (
            <Link
              key={id}
              to={tabUrl(id)}
              data-tab={id}
              aria-current={on ? "page" : undefined}
              className={`lf-tab relative z-10 flex shrink-0 items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left text-sm font-medium ${
                on
                  ? "lf-tab-on text-white"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Icon className={`text-base ${on ? "text-sky-400" : "text-slate-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-slate-800 lg:block">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 border-l-4 border-transparent px-6 py-3 text-left text-sm text-rose-400 transition hover:bg-slate-800 hover:text-rose-300"
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </div>
    </aside>
  );
}