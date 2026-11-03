// Single source of truth for the workflow pipeline: stage order, labels,
// colors, the action-button text shown on a card in a given stage, and
// where that button sends the project next.
//
// Note: "completed" (post-editing, pre-delivery) and "paid-completed"
// (after payment) are two different stages that both display as
// "Completed" per the requested flow — kept as separate keys internally
// so a project's real position in the pipeline is never ambiguous, even
// though the label repeats.

export const STAGE_KEYS = [
  "coming-events",
  "shoot-completed",
  "editing",
  "edit-complete",
  "delivered",
  "paid-completed",
];

export const STAGE_LABELS = {
  "coming-events": "Coming Events",
  "shoot-completed": "Shoot Completed",
  editing: "Editing",
  "edit-complete": "Edit Complete",
  delivered: "Delivered",
  "paid-completed": "Completed",
};

// Button shown on a card while it's in this stage. null = terminal.
export const STAGE_ACTION_LABEL = {
  "coming-events": "Event Finished",
  "shoot-completed": "Continue to Edit?",
  editing: "Done Editing?",
  "edit-complete": "Album Delivered?",
  delivered: "Have You Been Paid?",
  "paid-completed": null,
};

// Where a project goes when its action button is clicked.
export const STAGE_NEXT = {
  "coming-events": "shoot-completed",
  "shoot-completed": "editing",
  editing: "edit-complete",
  "edit-complete": "delivered",
  delivered: "paid-completed",
  "paid-completed": null,
};

export const STAGE_BADGE_CLASSES = {
  "coming-events": "bg-sky-500",
  "shoot-completed": "bg-violet-500",
  editing: "bg-amber-500",
  "edit-complete": "bg-teal-500",
  delivered: "bg-emerald-500",
  "paid-completed": "bg-slate-500",
};

export const STAGE_SOFT_CLASSES = {
  "coming-events": "bg-sky-500/15 text-sky-400",
  "shoot-completed": "bg-violet-500/15 text-violet-400",
  editing: "bg-amber-500/15 text-amber-400",
  "edit-complete": "bg-teal-500/15 text-teal-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  "paid-completed": "bg-slate-500/15 text-slate-300",
};

export const STAGE_COLUMN_BORDER = {
  "coming-events": "border-t-sky-500",
  "shoot-completed": "border-t-violet-500",
  editing: "border-t-amber-500",
  "edit-complete": "border-t-teal-500",
  delivered: "border-t-emerald-500",
  "paid-completed": "border-t-slate-500",
};

export function getAdjacentStage(stage, direction) {
  const index = STAGE_KEYS.indexOf(stage);
  if (index === -1) return null;

  const targetIndex = direction === "next" ? index + 1 : index - 1;
  return STAGE_KEYS[targetIndex] || null;
}

export function getTaskProgress(project) {
  const tasks = project?.tasks || [];
  if (tasks.length === 0) return 0;

  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}