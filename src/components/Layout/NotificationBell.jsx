import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCheckCircle,
  FaImages,
  FaRegCalendarAlt,
  FaInfoCircle,
} from "react-icons/fa";

import { supabase } from "../../lib/supabaseClient";
import {
  subscribeNotifications,
  getNotifications,
  markAllRead,
  clearNotifications,
} from "../../lib/notifications";

const TODAY_SEEN_KEY = "lensflow_today_seen";
const REFRESH_MS = 5 * 60 * 1000; // re-check today's schedule every 5 minutes

const TYPE_ICON = {
  culling: <FaCheckCircle />,
  previews: <FaImages />,
  info: <FaInfoCircle />,
};

const TYPE_TONE = {
  culling: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  previews: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

function localDateKey() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function timeAgo(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const previousUnreadIdsRef = useRef(null);

  const stored = useSyncExternalStore(subscribeNotifications, getNotifications);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [todayEvents, setTodayEvents] = useState([]);
  const [todaySeen, setTodaySeen] = useState(
    () => localStorage.getItem(TODAY_SEEN_KEY) || ""
  );
  const [unreadAtOpen, setUnreadAtOpen] = useState(new Set());

  const closePanel = useCallback(() => {
    setClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 180);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Ring only when a notification becomes newly unread after the initial render.
  useEffect(() => {
    const unreadIds = new Set(stored.filter((item) => !item.read).map((item) => item.id));
    const previousUnreadIds = previousUnreadIdsRef.current;
    previousUnreadIdsRef.current = unreadIds;
    if (previousUnreadIds !== null) {
      const hasNewUnread = [...unreadIds].some((id) => !previousUnreadIds.has(id));
      if (hasNewUnread) {
        setRinging(true);
        const timer = setTimeout(() => setRinging(false), 700);
        return () => clearTimeout(timer);
      }
    }
  }, [stored]);

  /* ---- today's scheduled work ---- */
  const loadToday = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { data, error } = await supabase
      .from("schedule_events")
      .select("id, title, client, start_time, status")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to load today's schedule:", error.message);
      return;
    }

    setTodayEvents(
      (data || [])
        .filter((row) => row.status !== "completed")
        .map((row) => ({
          id: row.id,
          title: row.title || "Untitled Event",
          client: row.client,
          start: new Date(row.start_time),
        }))
    );
  }, []);

  useEffect(() => {
    loadToday();

    const timer = setInterval(loadToday, REFRESH_MS);
    window.addEventListener("focus", loadToday);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", loadToday);
    };
  }, [loadToday]);

  /* ---- close when clicking outside ---- */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closePanel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, closePanel]);

  /* ---- unread state ---- */
  const todayKey = `${localDateKey()}:${todayEvents.length}`;
  const todayUnread = todayEvents.length > 0 && todaySeen !== todayKey;
  const unreadCount =
    stored.filter((item) => !item.read).length + (todayUnread ? 1 : 0);

  const toggle = () => {
    if (open) {
      closePanel();
      return;
    }
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setClosing(false);

    // Remember what was unread so it stays highlighted while the panel is open.
    setUnreadAtOpen(
      new Set(stored.filter((item) => !item.read).map((item) => item.id))
    );
    setOpen(true);
    loadToday();

    markAllRead();
    localStorage.setItem(TODAY_SEEN_KEY, todayKey);
    setTodaySeen(todayKey);
  };

  const openItem = (item) => {
    if (item.to) navigate(item.to);
    closePanel();
  };

  const isEmpty = todayEvents.length === 0 && stored.length === 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Same button the header already had, with the dot now driven by real data */}
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : "Notifications"}
        className="relative p-2 text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        <style>{`
          @keyframes lensflow-bell-ring {
            0%, 100% { transform: rotate(0); }
            12%, 36%, 60%, 84% { transform: rotate(9deg); }
            24%, 48%, 72% { transform: rotate(-9deg); }
          }
          @keyframes lensflow-notification-in {
            from { opacity: 0; transform: translateY(-7px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes lensflow-notification-out {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-5px) scale(0.98); }
          }
          @media (prefers-reduced-motion: reduce) {
            .lensflow-bell-ring, .lensflow-notification-in, .lensflow-notification-out { animation: none !important; }
          }
        `}</style>
        <span className={`relative inline-flex origin-top ${ringing ? "lensflow-bell-ring" : ""}`} style={ringing ? { animation: "lensflow-bell-ring 650ms ease-in-out" } : undefined}>
          <FaBell className="text-lg" />
        </span>

        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${closing ? "lensflow-notification-out" : "lensflow-notification-in"}`}
          style={{ width: 340, maxWidth: "calc(100vw - 1.5rem)", animation: `${closing ? "lensflow-notification-out" : "lensflow-notification-in"} 180ms cubic-bezier(0.22, 1, 0.36, 1) both` }}
          onAnimationEnd={(e) => {
            if (closing && e.target === e.currentTarget) {
              setOpen(false);
              setClosing(false);
            }
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Notifications
            </h3>
            {stored.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="text-xs text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isEmpty && (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                You're all caught up.
              </p>
            )}

            {/* Today's scheduled work */}
            {todayEvents.length > 0 && (
              <section className="border-b border-slate-200 px-4 py-3 dark:border-slate-800/70">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <FaRegCalendarAlt />
                  {todayEvents.length === 1
                    ? "1 shoot today"
                    : `${todayEvents.length} shoots today`}
                </p>

                <ul className="space-y-1">
                  {todayEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => openItem({ to: "/dashboard/schedule" })}
                        className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="w-16 flex-shrink-0 text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                          {formatTime(event.start)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-900 dark:text-white">
                            {event.title}
                          </span>
                          {event.client && (
                            <span className="block truncate text-xs text-slate-500">
                              {event.client}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Culling / previews / other */}
            {stored.length > 0 && (
              <ul>
                {stored.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="flex w-full items-start gap-3 border-b border-slate-200 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/60"
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm ${
                          TYPE_TONE[item.type] || TYPE_TONE.info
                        }`}
                      >
                        {TYPE_ICON[item.type] || TYPE_ICON.info}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          {unreadAtOpen.has(item.id) && (
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500" />
                          )}
                        </span>
                        {item.body && (
                          <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                            {item.body}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-600">
                          {timeAgo(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;