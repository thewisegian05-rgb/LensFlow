import { useEffect, useState } from "react";
import { FaCheck, FaMapMarkerAlt, FaRegCalendarAlt, FaStar } from "react-icons/fa";
import { supabase } from "../../../lib/supabaseClient";
import Section from "../components/ui/Section";

// Same stages as the photographer's Workflow tab, in the same order.
const STEPS = [
  { key: "coming-events", label: "Upcoming" },
  { key: "today-event", label: "Shoot day" },
  { key: "shoot-completed", label: "Shoot done" },
  { key: "editing", label: "Editing" },
  { key: "edit-complete", label: "Edit ready" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

const LAST = STEPS.length - 1;

function formatDay(value) {
  if (!value) return "";
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Progress of the client's confirmed events. The stage comes from the
 * photographer's Workflow tab, so moving a card there updates this.
 *   activeId - the active photographer's id
 *   goTo     - tab switcher from the client portal
 */
export default function EventProgress({ activeId, goTo }) {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase.rpc("my_event_progress");

      if (cancelled) return;

      if (error) {
        console.error("Could not load event progress:", error.message);
      } else {
        setEvents(Array.isArray(data) ? data : []);
      }
      setLoaded(true);
    };

    load();

    // Pick up changes the photographer makes in the Workflow tab.
    const timer = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const mine = events.filter((e) => !activeId || e.photographer_id === activeId);

  // Nothing booked yet: keep Home clean.
  if (!loaded || mine.length === 0) return null;

  return (
    <Section title="Your Events" dot="bg-emerald-400" reveal={false}>
      <div className="space-y-3">
        {mine.map((event) => {
          const idx = STEPS.findIndex((s) => s.key === event.stage);
          const finished = idx === LAST;
          const stageLabel = idx >= 0 ? STEPS[idx].label : "Booked";

          return (
            <article
              key={event.booking_id}
              className="min-w-0 rounded-xl border border-slate-700 bg-slate-950/40 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-white">
                    {event.title || "Your booking"}
                  </h4>

                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <FaRegCalendarAlt className="text-[10px]" />
                      {formatDay(event.event_date)} · {String(event.start_time).slice(0, 5)}–
                      {String(event.end_time).slice(0, 5)}
                    </span>

                    {event.location && (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <FaMapMarkerAlt className="text-[10px]" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    )}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    finished
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-sky-500/10 text-sky-300"
                  }`}
                >
                  {stageLabel}
                </span>
              </div>

              {/* STAGE TRACKER */}
              <div className="mt-4 overflow-x-auto pb-1">
                <ol className="flex min-w-[520px] items-start">
                  {STEPS.map((step, i) => {
                    const done = finished || i < idx;
                    const current = !finished && i === idx;
                    const lineLit = finished || i <= idx;

                    return (
                      <li
                        key={step.key}
                        className="relative flex flex-1 flex-col items-center text-center"
                      >
                        {i > 0 && (
                          <span
                            className={`absolute left-[-50%] top-3 h-0.5 w-full ${
                              lineLit ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                            aria-hidden="true"
                          />
                        )}

                        <span
                          className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                            done
                              ? "bg-emerald-500 text-slate-950"
                              : current
                              ? "bg-sky-500 text-slate-950 ring-4 ring-sky-500/25"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {done ? <FaCheck className="text-[9px]" /> : i + 1}
                        </span>

                        <span
                          className={`mt-1.5 px-0.5 text-[10px] font-medium leading-tight ${
                            current
                              ? "text-sky-300"
                              : done
                              ? "text-slate-300"
                              : "text-slate-500"
                          }`}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* REVIEW: only after Completed */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                {finished ? (
                  <>
                    <p className="text-xs text-emerald-400">
                      All done. Thanks for working with us!
                    </p>

                    <button
                      type="button"
                      onClick={() => goTo?.("reviews")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      <FaStar className="text-[10px]" />
                      Leave a review
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    You can leave a review once this event reaches Completed.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}