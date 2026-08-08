// =========================================================
// workflowStages.js
// =========================================================
// Single source of truth for the project pipeline: what stages exist,
// what order they run in, and what color/icon goes with each. Every
// workflow component (WorkflowPage, ProjectCard, WorkflowSummary,
// AddProjectModal) imports from here so the pipeline can never drift
// out of sync between components.
// =========================================================

// Canonical stage keys, in pipeline order. Index order IS the pipeline
// order — components that move a card forward/back one stage just walk
// this array by index.
export const STAGE_KEYS = [
  "inquiry",
  "booked",
  "shoot-completed",
  "editing",
  "review",
  "delivered",
];

export const STAGE_LABELS = {
  inquiry: "Inquiry",
  booked: "Booked",
  "shoot-completed": "Shoot Completed",
  editing: "Editing",
  review: "Client Review",
  delivered: "Delivered",
};

// Solid-fill badge classes — one hue per stage, roughly tracking
// "cold → warm → done" so the pipeline reads left-to-right at a glance.
export const STAGE_BADGE_CLASSES = {
  inquiry: "bg-slate-500",
  booked: "bg-sky-500",
  "shoot-completed": "bg-violet-500",
  editing: "bg-amber-500",
  review: "bg-orange-500",
  delivered: "bg-emerald-500",
};

export const STAGE_SOFT_CLASSES = {
  inquiry: "bg-slate-500/15 text-slate-300",
  booked: "bg-sky-500/15 text-sky-400",
  "shoot-completed": "bg-violet-500/15 text-violet-400",
  editing: "bg-amber-500/15 text-amber-400",
  review: "bg-orange-500/15 text-orange-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
};

// Column header accent (top border) so each Kanban column is
// identifiable even when scrolled and the header icon isn't visible.
export const STAGE_COLUMN_BORDER = {
  inquiry: "border-t-slate-500",
  booked: "border-t-sky-500",
  "shoot-completed": "border-t-violet-500",
  editing: "border-t-amber-500",
  review: "border-t-orange-500",
  delivered: "border-t-emerald-500",
};

// Returns the stage key that comes after/before the given one, or null
// at the ends of the pipeline. Used for the "move" chevrons on cards.
export function getAdjacentStage(stage, direction) {
  const index = STAGE_KEYS.indexOf(stage);
  if (index === -1) return null;

  const targetIndex = direction === "next" ? index + 1 : index - 1;
  return STAGE_KEYS[targetIndex] || null;
}

// Percentage of a project's checklist that's complete. Returns 0 for
// projects with no tasks yet, rather than NaN/Infinity.
export function getTaskProgress(project) {
  const tasks = project?.tasks || [];
  if (tasks.length === 0) return 0;

  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}