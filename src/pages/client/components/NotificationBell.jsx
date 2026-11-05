import { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";

export default function NotificationBell({
  items = [],
  compact = false,
  menuClassName = "right-0 w-72",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = items.filter((n) => !n.read && !n.read_at).length;

  // close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className={`relative flex items-center justify-center rounded-full border border-slate-700 bg-[#0B1628] text-slate-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 ${
          compact ? "h-9 w-9 text-sm" : "h-10 w-10"
        }`}
      >
        <FaBell />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-2 rounded-xl border border-slate-700 bg-[#0B1628] p-2 shadow-xl shadow-black/40 ${menuClassName}`}
        >
          {items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-400">You're all caught up.</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {items.slice(0, 8).map((n, i) => (
                <li
                  key={n.id ?? i}
                  className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60"
                >
                  <p className={!n.read && !n.read_at ? "font-semibold text-white" : ""}>
                    {n.title || n.message || "Notification"}
                  </p>
                  {n.title && n.message && <p className="text-xs text-slate-400">{n.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}