
import { useCallback, useEffect, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";

const SMOOTH_EASE = [0.22, 1, 0.36, 1];
const LOADING_DURATION_MS = 2000;

// Keep these stages and their order identical to Workflow.jsx.
const STAGES = [
  { key: "coming-events", label: "Coming Events", color: "bg-sky-500" },
  { key: "today-event", label: "Today's Event", color: "bg-amber-500" },
  { key: "shoot-completed", label: "Shoot Completed", color: "bg-violet-500" },
  { key: "editing", label: "Editing", color: "bg-orange-500" },
  { key: "edit-complete", label: "Edit Complete", color: "bg-indigo-500" },
  { key: "delivered", label: "Delivered", color: "bg-teal-500" },
  { key: "completed", label: "Completed", color: "bg-emerald-500" },
];

const STAGE_INDEX = Object.fromEntries(
  STAGES.map((stage, index) => [stage.key, index])
);

function todayString() {
  return new Date().toLocaleDateString("en-CA");
}

// Mirrors the stage derivation used by Workflow.jsx.
function deriveStage(event, linkedProjectStage) {
  const eventDay = new Date(event.start_time).toLocaleDateString("en-CA");
  const today = todayString();

  // Future events always remain in Coming Events.
  if (eventDay > today) {
    return "coming-events";
  }

  if (event.workflow_stage in STAGE_INDEX) {
    return event.workflow_stage;
  }

  if (
    linkedProjectStage in STAGE_INDEX &&
    linkedProjectStage !== "coming-events"
  ) {
    return linkedProjectStage;
  }

  if (event.status === "completed") {
    return "shoot-completed";
  }

  if (eventDay === today) {
    return "today-event";
  }

  return "shoot-completed";
}

function createEmptyCounts() {
  return Object.fromEntries(STAGES.map(({ key }) => [key, 0]));
}

function WorkflowSummary() {
  const [counts, setCounts] = useState(createEmptyCounts());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Keep the loading placeholder visible for at least two seconds,
  // while also waiting for the initial database request to finish.
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] =
    useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const fetchCounts = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      setRefreshing(true);
    }

    try {
      // Use the same source as the Workflow board.
      const { data: events, error: eventsError } = await supabase
        .from("schedule_events")
        .select("*")
        .order("start_time", { ascending: true });

      if (eventsError) {
        throw eventsError;
      }

      const rows = events || [];

      // Fetch linked project stages, just as Workflow.jsx does.
      const projectIds = [
        ...new Set(rows.map((event) => event.project_id).filter(Boolean)),
      ];

      const projectById = {};

      if (projectIds.length > 0) {
        const { data: linkedProjects, error: projectsError } =
          await supabase
            .from("projects")
            .select("id, stage")
            .in("id", projectIds);

        if (projectsError) {
          throw projectsError;
        }

        (linkedProjects || []).forEach((project) => {
          projectById[project.id] = project;
        });
      }

      const tally = createEmptyCounts();

      rows.forEach((event) => {
        const linkedProject = event.project_id
          ? projectById[event.project_id]
          : null;

        const stage = deriveStage(event, linkedProject?.stage);

        if (tally[stage] !== undefined) {
          tally[stage] += 1;
        }
      });

      setCounts(tally);
    } catch (error) {
      console.error("Failed to load workflow summary:", error.message);

      // Keep the last successful counts if a later refresh fails.
    } finally {
      if (isInitialLoad) {
        setInitialLoadComplete(true);
      }

      setRefreshing(false);
    }
  }, []);

  // Initial fetch and minimum loading duration.
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoadingElapsed(true);
    }, LOADING_DURATION_MS);

    fetchCounts(true);

    return () => clearTimeout(timer);
  }, [fetchCounts]);

  useEffect(() => {
    setLoading(!(minimumLoadingElapsed && initialLoadComplete));
  }, [minimumLoadingElapsed, initialLoadComplete]);

  // Refresh when the dashboard becomes visible again.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCounts(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [fetchCounts]);

  const total = STAGES.reduce(
    (sum, { key }) => sum + (counts[key] || 0),
    0
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: SMOOTH_EASE }}
        className="rounded-xl border border-slate-700 bg-slate-900 p-4"
      >
        <header className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Workflow Summary
          </h3>

          <div className="flex items-center gap-2">
            {refreshing && !loading && (
              <span className="text-[10px] text-slate-500">
                Updating...
              </span>
            )}

            <motion.span
              key={loading ? "loading" : total}
              initial={{ scale: 1.3, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 22,
              }}
              className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300"
            >
              {loading ? "…" : total}
            </motion.span>
          </div>
        </header>

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {STAGES.map((stage, index) => {
            const count = counts[stage.key] || 0;
            const percentage =
              total === 0 ? 0 : Math.round((count / total) * 100);

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: SMOOTH_EASE,
                  delay: 0.1 + index * 0.06,
                }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    {stage.label}
                  </span>

                  <span className="font-semibold tabular-nums text-white">
                    {loading ? "…" : count}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  {loading ? (
                    <div className="h-full w-full animate-pulse rounded-full bg-slate-700/60" />
                  ) : (
                    <motion.div
                      className={`h-full rounded-full ${stage.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{
                        duration: 0.9,
                        ease: SMOOTH_EASE,
                        delay: index * 0.06,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </MotionConfig>
  );
}

export default WorkflowSummary;
