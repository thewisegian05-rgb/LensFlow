import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaRegCalendarAlt,
  FaUser,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { supabase } from "../lib/supabaseClient";

/* ============ Stages (in order) ============ */
// Values match what the rest of the app already stores in projects.stage
// ("coming-events", "shoot-completed"), plus the new ones.
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

// Which column a scheduled shoot sits in. A stage you've set on the board wins;
// otherwise it follows the shoot's date and status.
function deriveStage(row, linkedProjectStage) {
  const eventDay = new Date(row.start_time).toLocaleDateString("en-CA");

  // A shoot that hasn't happened yet can only be in Coming Events.
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

// Moving past Coming Events is only allowed once the event's date has arrived.
function isFutureEvent(item) {
  return Boolean(item?.event_date) && item.event_date > todayString();
}

function sortProjects(a, b) {
  return (a.start_time || "").localeCompare(b.start_time || "");
}

/* ============ Card ============ */
function ProjectCard({ project, onMove, onDragStart, dragging }) {
  const index = STAGE_INDEX[project.stage];
  const locked = isFutureEvent(project);
  const isToday = project.event_date === todayString();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, project.id)}
      className={`rounded-xl border border-slate-200 bg-white p-3 transition
        hover:border-sky-400 hover:shadow-sm
        dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-sky-500/50
        ${dragging ? "opacity-40" : ""}
        cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-slate-900 dark:text-white">{project.name}</h4>
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
        <button
          type="button"
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
        </button>

        {project.project_code && (
          <span className="font-mono text-[9px] text-slate-400 dark:text-slate-600">{project.project_code}</span>
        )}

        <button
          type="button"
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
        </button>
      </div>
    </div>
  );
}

/* ============ Page ============ */
function WorkflowPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

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

  /* ---- load scheduled shoots (same source as the Schedule page) ---- */
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

    // Linked projects (optional): their code, and any stage already set there.
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

      // Not before the shoot's date.
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
      // Same status the Schedule page sets when a shoot is done.
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

      // Keep the linked project (if there is one) on the same stage.
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
    return <p className="mt-20 text-center text-sm text-slate-500">Loading...</p>;
  }

  if (!user) {
    return (
      <p className="mt-20 text-center text-sm text-slate-500">
        Sign in to see your workflow.
      </p>
    );
  }

  return (
    <div onDragEnd={handleDragEnd}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
          Workflow
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Every shoot from your Schedule, from booking to delivery. Drag cards between stages or use the arrows.
        </p>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading your shoots...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] dark:[scrollbar-color:rgb(71_85_105)_transparent]">
          {STAGES.map((stage) => {
            const list = grouped[stage.key];
            const isOver = dragOverStage === stage.key;

            return (
              <section
                key={stage.key}
                onDragOver={(e) => {
                  const dragged = projects.find((p) => p.id === draggingId);
                  const blocked = isFutureEvent(dragged) && STAGE_INDEX[stage.key] > 0;
                  if (blocked) {
                    e.dataTransfer.dropEffect = "none";
                    return; // not preventing default = drop not allowed here
                  }
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== stage.key) setDragOverStage(stage.key);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null);
                }}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`flex max-h-[calc(100vh-12rem)] w-72 flex-shrink-0 flex-col rounded-2xl border bg-white/70 transition-colors
                dark:bg-slate-900/70
                ${
                  isOver
                    ? "border-sky-400 bg-sky-50/70 dark:border-sky-500/70 dark:bg-sky-500/5"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <header className="flex items-center justify-between gap-2 px-4 py-3">
                  <h3 className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${stage.dot}`} />
                    <span className="truncate">{stage.label}</span>
                  </h3>
                  <span
                    className={`rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums
                    dark:bg-slate-800
                    ${stage.text}`}
                  >
                    {list.length}
                  </span>
                </header>

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] dark:[scrollbar-color:rgb(71_85_105)_transparent]">
                  {list.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-600">
                      {isOver ? "Drop here" : "Nothing here"}
                    </div>
                  ) : (
                    list.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        dragging={draggingId === project.id}
                        onMove={moveProject}
                        onDragStart={handleDragStart}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WorkflowPage;