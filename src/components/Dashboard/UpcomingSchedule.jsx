import { useCallback, useEffect, useState } from "react";
import { FaMapMarkerAlt, FaRegCalendarCheck } from "react-icons/fa";

import { supabase } from "../../lib/supabaseClient";
import {
  getEventCategory,
  CATEGORY_HEX,
  CATEGORY_LABELS,
} from "../Schedule/eventCategory";

const SHOW = 6;

const peso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;

const hexToRgba = (hex, alpha = 1) => {
  const normalized = (hex || "#38bdf8").replace("#", "");
  const safe =
    normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
  const value = Number.parseInt(safe, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// "Today", "Tomorrow", "In 5 days"
function relativeDay(date) {
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  if (diff === 0) return { text: "Today", tone: "now" };
  if (diff === 1) return { text: "Tomorrow", tone: "soon" };
  if (diff < 7) return { text: `In ${diff} days`, tone: "soon" };
  if (diff < 31) return { text: `In ${Math.round(diff / 7)} wk`, tone: "later" };
  return { text: `In ${Math.round(diff / 30)} mo`, tone: "later" };
}

// Mid-tone text colors (500/600) stay readable on both light and dark backgrounds.
const TONE = {
  now: "bg-rose-500/15 text-rose-500",
  soon: "bg-amber-500/20 text-amber-600",
  later: "bg-slate-500/20 text-slate-500",
};

function UpcomingSchedule({ refreshTick = 0 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("schedule_events")
      .select("id, title, client, category, location, start_time, end_time, talent_fee, status")
      .gte("start_time", startOfDay(new Date()).toISOString())
      .order("start_time", { ascending: true })
      .limit(40);

    if (err) {
      console.error("Failed to load upcoming schedule:", err.message);
      setError(err.message);
    } else {
      setError("");
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // The dashboard asks for a reload after bookings change.
  useEffect(() => {
    if (refreshTick > 0) load();
  }, [refreshTick, load]);

  const visible = events.slice(0, SHOW);
  const hidden = events.length - visible.length;

  return (
    <section className="h-full rounded-xl border border-slate-700 bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Upcoming Schedule
        </h3>
        <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums">
          {events.length}
        </span>
      </header>

      <div className="p-4">
        {error && <p className="mb-2 text-xs text-red-400">Could not load schedule: {error}</p>}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-500/15" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
            <FaRegCalendarCheck className="text-2xl text-slate-600" />
            Nothing coming up. Enjoy the break!
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((event, index) => {
              const start = new Date(event.start_time);
              const category = getEventCategory(event);
              const hex = CATEGORY_HEX[category] || CATEGORY_HEX.default || "#38bdf8";
              const label = CATEGORY_LABELS[category] || event.category;
              const rel = relativeDay(start);
              const done = event.status === "completed";

              return (
                <article
                  key={event.id}
                  className="relative flex cursor-default items-center gap-3 rounded-lg border bg-slate-500/[0.04] p-2.5 transition-all duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:bg-slate-500/[0.08] hover:shadow-lg hover:shadow-black/20"
                  style={{
                    borderColor: hexToRgba(hex, index === 0 ? 0.55 : 0.2),
                    boxShadow: index === 0 ? `0 0 0 1px ${hexToRgba(hex, 0.15)}` : undefined,
                  }}
                >
                  {/* Date block */}
                  <div
                    className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg"
                    style={{ backgroundColor: hexToRgba(hex, 0.14), color: hex }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      {start.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-xl font-bold leading-none tabular-nums">
                      {start.getDate()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {event.title}
                      {index === 0 && (
                        <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-sky-500">
                          Next up
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      <span className="font-medium">
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {event.client ? ` · ${event.client}` : ""}
                      {label ? ` · ${label}` : ""}
                    </p>
                    {event.location && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                        <FaMapMarkerAlt className="flex-shrink-0 text-[9px]" />
                        {event.location}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    {done ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        Done
                      </span>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[rel.tone]}`}>
                        {rel.text}
                      </span>
                    )}
                    {Number(event.talent_fee) > 0 && (
                      <span className="text-xs font-semibold tabular-nums">
                        {peso(event.talent_fee)}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {hidden > 0 && (
              <p className="pt-1 text-center text-xs text-slate-500">
                +{hidden} more on your Schedule page
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default UpcomingSchedule;