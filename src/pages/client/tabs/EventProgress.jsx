
import { useEffect, useState } from "react";
import {
  FaCheck,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaStar,
} from "react-icons/fa";

import { supabase } from "../../../lib/supabaseClient";
import Section from "../components/ui/Section";

// Same stages as the photographer's Workflow tab.
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

  const [year, month, day] = String(value)
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventProgress({
  activeId,
  goTo,
}) {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // ==========================================
  // LOAD EVENT PROGRESS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } =
          await supabase.rpc("my_event_progress");

        if (cancelled) return;

        if (error) {
          throw error;
        }

        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Could not load event progress:",
            error
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    load();

    // Check for Workflow updates every 15 seconds.
    const timer = setInterval(load, 15000);

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Only show events for the selected photographer.
  const mine = events.filter(
    (event) =>
      !activeId ||
      event.photographer_id === activeId
  );

  // Keep Home clean when there are no events.
  if (!loaded || mine.length === 0) {
    return null;
  }

  return (
    <Section
      title="Your Events"
      dot="bg-emerald-400"
      reveal={false}
    >
      <div className="space-y-3">
        {mine.map((event) => {
          const index = STEPS.findIndex(
            (step) => step.key === event.stage
          );

          const finished = index === LAST;

          const stageLabel =
            index >= 0
              ? STEPS[index].label
              : "Booked";

          return (
            <article
              key={event.booking_id}
              className="
                min-w-0 rounded-xl
                border border-slate-200
                bg-slate-50/80 p-3
                text-slate-900

                transition-colors duration-300

                sm:p-4

                dark:border-slate-700
                dark:bg-slate-950/40
                dark:text-slate-100
              "
            >
              {/* EVENT DETAILS */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {event.title || "Your booking"}
                  </h4>

                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <FaRegCalendarAlt
                        className="text-[10px]"
                        aria-hidden="true"
                      />

                      {formatDay(event.event_date)} ·{" "}
                      {String(event.start_time).slice(0, 5)}–
                      {String(event.end_time).slice(0, 5)}
                    </span>

                    {event.location && (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <FaMapMarkerAlt
                          className="text-[10px]"
                          aria-hidden="true"
                        />

                        <span className="truncate">
                          {event.location}
                        </span>
                      </span>
                    )}
                  </p>
                </div>

                {/* CURRENT WORKFLOW STAGE */}
                <span
                  className={`
                    rounded-full px-2.5 py-0.5
                    text-[10px] font-semibold

                    ${
                      finished
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                    }
                  `}
                >
                  {stageLabel}
                </span>
              </div>

              {/* ======================================
                  STAGE TRACKER
                 ====================================== */}

              <div className="custom-scrollbar mt-4 overflow-x-auto pb-2">
                <ol className="flex min-w-[520px] items-start">
                  {STEPS.map((step, i) => {
                    const done =
                      finished || i < index;

                    const current =
                      !finished && i === index;

                    const lineLit =
                      finished || i <= index;

                    return (
                      <li
                        key={step.key}
                        className="relative flex flex-1 flex-col items-center text-center"
                      >
                        {/* CONNECTING LINE */}
                        {i > 0 && (
                          <span
                            className={`
                              absolute left-[-50%]
                              top-3 h-0.5 w-full

                              ${
                                lineLit
                                  ? "bg-emerald-500"
                                  : "bg-slate-200 dark:bg-slate-700"
                              }
                            `}
                            aria-hidden="true"
                          />
                        )}

                        {/* STAGE CIRCLE */}
                        <span
                          className={`
                            relative z-10
                            flex h-6 w-6
                            items-center justify-center
                            rounded-full

                            text-[10px] font-bold
                            transition-colors duration-200

                            ${
                              done
                                ? "bg-emerald-500 text-white dark:text-slate-950"
                                : current
                                  ? "bg-sky-500 text-white ring-4 ring-sky-500/20 dark:text-slate-950 dark:ring-sky-500/25"
                                  : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                            }
                          `}
                        >
                          {done ? (
                            <FaCheck className="text-[9px]" />
                          ) : (
                            i + 1
                          )}
                        </span>

                        {/* STAGE LABEL */}
                        <span
                          className={`
                            mt-1.5 px-0.5
                            text-[10px] font-medium
                            leading-tight

                            ${
                              current
                                ? "text-sky-700 dark:text-sky-300"
                                : done
                                  ? "text-slate-700 dark:text-slate-300"
                                  : "text-slate-400 dark:text-slate-500"
                            }
                          `}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* ======================================
                  REVIEW ACTION
                 ====================================== */}

              <div
                className="
                  mt-3 flex flex-wrap
                  items-center justify-between
                  gap-2 border-t
                  border-slate-200 pt-3

                  dark:border-slate-800
                "
              >
                {finished ? (
                  <>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      All done. Thanks for working with us!
                    </p>

                    <button
                      type="button"
                      onClick={() => goTo?.("reviews")}
                      className="
                        inline-flex items-center
                        gap-1.5 rounded-lg

                        bg-amber-400
                        px-3 py-1.5

                        text-xs font-semibold
                        text-slate-950

                        transition hover:bg-amber-300

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-amber-500
                      "
                    >
                      <FaStar
                        className="text-[10px]"
                        aria-hidden="true"
                      />

                      Leave a review
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You can leave a review once this event
                    reaches Completed.
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
