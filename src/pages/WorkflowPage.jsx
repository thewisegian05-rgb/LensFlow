import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import {
  FaChevronLeft,
  FaChevronRight,
  FaRegCalendarAlt,
  FaUser,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { supabase } from "../lib/supabaseClient";

/* ============ Settings ============ */
const MIN_LOADING_MS = 2000; // loading always lasts at least 2 seconds
const SMOOTH_EASE = [0.22, 1, 0.36, 1];

/* ============ Stages (in order) ============ */
const STAGES = [
  {
    key: "coming-events",
    label: "Coming Events",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "today-event",
    label: "Today's Event",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "shoot-completed",
    label: "Shoot Completed",
    dot: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "editing",
    label: "Editing",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "edit-complete",
    label: "Edit Complete",
    dot: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  {
    key: "delivered",
    label: "Delivered",
    dot: "bg-teal-500",
    text: "text-teal-600 dark:text-teal-400",
  },
  {
    key: "completed",
    label: "Completed",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
];

const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));
const SHOOT_COMPLETED_INDEX = STAGE_INDEX["shoot-completed"];

/* ============ Helpers ============ */
function todayString() {
  return new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
}

function formatDate(value) {
  if (!value) return "No date";
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function deriveStage(row, linkedProjectStage) {
  const eventDay = new Date(row.start_time).toLocaleDateString("en-CA");

  if (eventDay > todayString()) return "coming-events";

  if (row.workflow_stage in STAGE_INDEX) return row.workflow_stage;
  if (linkedProjectStage in STAGE_INDEX && linkedProjectStage !== "coming-events") {
    return linkedProjectStage;
  }
  if (row.status === "completed") return "shoot-completed";

  const today = todayString();
  if (eventDay === today) return "today-event";
  return "shoot-completed";
}

function isFutureEvent(item) {
  return Boolean(item?.event_date) && item.event_date > todayString();
}

function sortProjects(a, b) {
  return (a.start_time || "").localeCompare(b.start_time || "");
}

/* ============ Loading skeleton ============ */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-2 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-2 h-2 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 h-5 w-full rounded bg-slate-100 dark:bg-slate-700/50" />
    </div>
  );
}

function LoadingBoard() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage, i) => (
        <motion.div
          key={stage.key}
          className="w-72 flex-shrink-0 rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/70"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: SMOOTH_EASE }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
              <span className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <span className="h-4 w-6 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* pulsing cards */}
          <motion.div
            className="space-y-2.5 px-3 pb-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
          >
            {Array.from({ length: i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 3 }).map((_, n) => (
              <SkeletonCard key={n} />
            ))}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

/* ============ Card ============ */

function ProjectCard({ project, onMove, onDragStart, dragging, delay = 0 }) {
  const index = STAGE_INDEX[project.stage];
  const locked = isFutureEvent(project);
  const isToday = project.event_date === todayString();

  return (
    <motion.div
      layout
      layoutId={`card-${project.id}`}
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
        opacity: { duration: 0.45, ease: "easeOut", delay },
        y: { type: "spring", stiffness: 220, damping: 26, delay },
        scale: { type: "spring", stiffness: 220, damping: 26, delay },
      }}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, project.id)}
        className={`rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200
          hover:border-sky-400 hover:shadow-sm
          dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-sky-500/50
          ${dragging ? "scale-95 opacity-40" : ""}
          cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug text-slate-900 dark:text-white">
            {project.name}
          </h4>
          {project.category && (
            <span className="flex-shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              {project.category}
            </span>
          )}
        </div>

        {project.client && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <FaUser className="text-[9px]" />
            <span className="truncate">{project.client}</span>
          </p>
        )}

        <p
          className={`mt-1 flex items-center gap-1.5 text-[11px] ${
            isToday
              ? "font-semibold text-amber-600 dark:text-amber-400"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          <FaRegCalendarAlt className="text-[9px]" />
          {isToday ? "Today" : formatDate(project.event_date)}
          {project.time && <span className="text-slate-500">· {project.time}</span>}
        </p>

        {project.location && (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <FaMapMarkerAlt className="text-[9px]" />
            <span className="truncate">{project.location}</span>
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700/70">
          <motion.button
            type="button"
            whileTap={index === 0 ? undefined : { scale: 0.85 }}
            onClick={() => onMove(project.id, index - 1)}
            disabled={index === 0}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition
              hover:bg-slate-100 hover:text-slate-800
              dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white
              disabled:cursor-not-allowed disabled:opacity-30
              disabled:hover:bg-transparent"
            title="Previous stage"
          >
            <FaChevronLeft className="text-[10px]" />
          </motion.button>

          {project.project_code && (
            <span className="font-mono text-[9px] text-slate-400 dark:text-slate-600">
              {project.project_code}
            </span>
          )}

          <motion.button
            type="button"
            whileTap={index === STAGES.length - 1 || locked ? undefined : { scale: 0.85 }}
            onClick={() => onMove(project.id, index + 1)}
            disabled={index === STAGES.length - 1 || locked}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition
              hover:bg-sky-500 hover:text-slate-950
              dark:text-slate-400
              disabled:cursor-not-allowed disabled:opacity-30
              disabled:hover:bg-transparent disabled:hover:text-slate-400"
            title={locked ? `Available on ${formatDate(project.event_date)}` : "Next stage"}
          >
            <FaChevronRight className="text-[10px]" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ============ Page ============ */
function WorkflowPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  // Loading must last at least MIN_LOADING_MS, even if the data is ready sooner.
  const [minElapsed, setMinElapsed] = useState(false);
  // Staggered card delays only apply to the very first reveal.
  const [introDone, setIntroDone] = useState(false);

  const showLoading = loading || !minElapsed;

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showLoading) return;
    const timer = setTimeout(() => setIntroDone(true), 2200);
    return () => clearTimeout(timer);
  }, [showLoading]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  /* ---- auth ---- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---- load scheduled shoots ---- */
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: rows, error: eventErr } = await supabase
      .from("schedule_events")
      .select("*")
      .order("start_time", { ascending: true });

    if (eventErr) {
      console.error("Events load failed:", eventErr);
      setError(eventErr.message);
      setLoading(false);
      return;
    }

    const projectIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean))];
    const projectById = {};

    if (projectIds.length > 0) {
      const { data: linked, error: projectErr } = await supabase
        .from("projects")
        .select("id, project_code, stage")
        .in("id", projectIds);

      if (projectErr) console.error("Linked projects load failed:", projectErr);
      (linked || []).forEach((p) => (projectById[p.id] = p));
    }

    const mapped = rows.map((row) => {
      const linked = row.project_id ? projectById[row.project_id] : null;

      return {
        id: row.id,
        project_id: row.project_id,
        project_code: linked?.project_code || null,
        name: row.title || "Untitled event",
        client: row.client,
        category: row.category,
        location: row.location,
        start_time: row.start_time,
        event_date: new Date(row.start_time).toLocaleDateString("en-CA"),
        time: formatTime(row.start_time),
        stage: deriveStage(row, linked?.stage),
      };
    });

    setProjects(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadProjects();
    else setProjects([]);
  }, [user, loadProjects]);

  /* ---- move a shoot to another stage ---- */
  const moveProject = useCallback(
    async (id, targetIndex) => {
      if (targetIndex < 0 || targetIndex >= STAGES.length) return;
      const stage = STAGES[targetIndex].key;
      const item = projects.find((p) => p.id === id);
      if (!item || item.stage === stage) return;

      if (targetIndex > 0 && isFutureEvent(item)) {
        setNotice(
          `"${item.name}" is scheduled for ${formatDate(item.event_date)}, so it can't move past Coming Events yet.`
        );
        return;
      }

      const previous = item.stage;
      setError("");
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)));

      const update = { workflow_stage: stage };
      if (targetIndex >= SHOOT_COMPLETED_INDEX && STAGE_INDEX[previous] < SHOOT_COMPLETED_INDEX) {
        update.status = "completed";
      }

      const { error: moveErr } = await supabase
        .from("schedule_events")
        .update(update)
        .eq("id", id);

      if (moveErr) {
        console.error("Move failed:", moveErr);
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, stage: previous } : p)));
        setError(
          moveErr.message.includes("workflow_stage")
            ? "The workflow_stage column is missing. Run the SQL from the chat, then try again."
            : moveErr.message
        );
        return;
      }

      if (item.project_id) {
        const { error: projectErr } = await supabase
          .from("projects")
          .update({ stage })
          .eq("id", item.project_id);

        if (projectErr) console.error("Failed to sync linked project:", projectErr);
      }
    },
    [projects]
  );

  /* ---- drag & drop ---- */
  function handleDragStart(e, id) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
  }

  function handleDrop(e, stageKey) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDragOverStage(null);
    setDraggingId(null);
    if (id) moveProject(id, STAGE_INDEX[stageKey]);
  }

  /* ---- grouping ---- */
  const grouped = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.key, []]));
    projects.forEach((p) => map[p.stage].push(p));
    Object.values(map).forEach((list) => list.sort(sortProjects));
    return map;
  }, [projects]);

  /* ============ RENDER ============ */
  if (authLoading) {
    return (
      <div className="mt-24 flex flex-col items-center gap-3">
        <motion.span
          className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-xs text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-20 text-center text-sm text-slate-500"
      >
        Sign in to see your workflow.
      </motion.p>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div onDragEnd={handleDragEnd}>
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: SMOOTH_EASE }}
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
            Workflow
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Every shoot from your Schedule, from booking to delivery. Drag cards between stages or
            use the arrows.
          </p>
        </motion.div>

        <AnimatePresence>
          {notice && (
            <motion.div
              key="notice"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-4 overflow-hidden rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {notice}
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: [0, -6, 6, -3, 3, 0] }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 overflow-hidden rounded-xl border border-rose-500/40 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* skeleton fades out first, then the real board fades in */}
        <AnimatePresence mode="wait">
          {showLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoadingBoard />
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <LayoutGroup>
                <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] dark:[scrollbar-color:rgb(71_85_105)_transparent]">
                  {STAGES.map((stage, i) => {
                    const list = grouped[stage.key];
                    const isOver = dragOverStage === stage.key;

                    return (
                      <motion.div
                        key={stage.key}
                        className="flex-shrink-0"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.55, ease: SMOOTH_EASE }}
                      >
                        <section
                          onDragOver={(e) => {
                            const dragged = projects.find((p) => p.id === draggingId);
                            const blocked = isFutureEvent(dragged) && STAGE_INDEX[stage.key] > 0;
                            if (blocked) {
                              e.dataTransfer.dropEffect = "none";
                              return;
                            }
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverStage !== stage.key) setDragOverStage(stage.key);
                          }}
                          onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null);
                          }}
                          onDrop={(e) => handleDrop(e, stage.key)}
                          className={`flex max-h-[calc(100vh-12rem)] w-72 flex-shrink-0 flex-col rounded-2xl border bg-white/70 transition-all duration-300
                          dark:bg-slate-900/70
                          ${
                            isOver
                              ? "scale-[1.015] border-sky-400 bg-sky-50/70 shadow-lg shadow-sky-500/10 dark:border-sky-500/70 dark:bg-sky-500/5"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <header className="flex items-center justify-between gap-2 px-4 py-3">
                            <h3 className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${stage.dot}`} />
                              <span className="truncate">{stage.label}</span>
                            </h3>

                            <motion.span
                              key={list.length}
                              initial={{ scale: 1.4 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 18 }}
                              className={`rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums
                              dark:bg-slate-800
                              ${stage.text}`}
                            >
                              {list.length}
                            </motion.span>
                          </header>

                          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] dark:[scrollbar-color:rgb(71_85_105)_transparent]">
                            {list.length === 0 ? (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: introDone ? 0 : 0.3 + i * 0.08 }}
                                className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-600"
                              >
                                {isOver ? "Drop here" : "Nothing here"}
                              </motion.div>
                            ) : (
                              list.map((project, n) => (
                                <ProjectCard
                                  key={project.id}
                                  project={project}
                                  dragging={draggingId === project.id}
                                  onMove={moveProject}
                                  onDragStart={handleDragStart}
                                  delay={introDone ? 0 : 0.2 + i * 0.08 + n * 0.07}
                                />
                              ))
                            )}
                          </div>
                        </section>
                      </motion.div>
                    );
                  })}
                </div>
              </LayoutGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default WorkflowPage;