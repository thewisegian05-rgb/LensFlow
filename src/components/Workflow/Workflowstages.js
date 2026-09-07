export const STAGE_KEYS = [
  "inquiry",
  "booked",
  "shoot-completed",
  "editing",
  "delivered",
  "review",
];

export const STAGE_LABELS = {
  inquiry: "Inquiry",
  booked: "Booked",
  "shoot-completed": "Shoot Completed",
  editing: "Editing",
  delivered: "Delivered",
  review: "Client Review",
};

export const STAGE_BADGE_CLASSES = {
  inquiry: "bg-slate-500",
  booked: "bg-sky-500",
  "shoot-completed": "bg-violet-500",
  editing: "bg-amber-500",
  delivered: "bg-emerald-500",
  review: "bg-orange-500",
};

export const STAGE_SOFT_CLASSES = {
  inquiry: "bg-slate-500/15 text-slate-300",
  booked: "bg-sky-500/15 text-sky-400",
  "shoot-completed": "bg-violet-500/15 text-violet-400",
  editing: "bg-amber-500/15 text-amber-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  review: "bg-orange-500/15 text-orange-400",
};

export const STAGE_COLUMN_BORDER = {
  inquiry: "border-t-slate-500",
  booked: "border-t-sky-500",
  "shoot-completed": "border-t-violet-500",
  editing: "border-t-amber-500",
  delivered: "border-t-emerald-500",
  review: "border-t-orange-500",
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