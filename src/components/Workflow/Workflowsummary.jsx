import {
  FaEnvelope,
  FaCalendarCheck,
  FaCamera,
  FaEdit,
  FaEye,
  FaCheckCircle,
} from "react-icons/fa";

import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_SOFT_CLASSES,
  getTaskProgress,
} from "./workflowStages";

// One icon per stage. Kept here (not in workflowStages.js) so that
// shared logic file doesn't need to depend on an icon library — same
// pattern as eventCategory.js / ScheduleSummary.jsx.
const STAGE_ICONS = {
  inquiry: <FaEnvelope />,
  booked: <FaCalendarCheck />,
  "shoot-completed": <FaCamera />,
  editing: <FaEdit />,
  review: <FaEye />,
  delivered: <FaCheckCircle />,
};

// Takes the same `projects` array WorkflowPage manages, so this widget
// (dropped into the Dashboard) always matches the real pipeline state.
function WorkflowSummary({ projects = [] }) {
  const activeProjects = projects.filter((p) => p.stage !== "delivered");

  const stageCounts = projects.reduce((counts, project) => {
    counts[project.stage] = (counts[project.stage] || 0) + 1;
    return counts;
  }, {});

  // Studio-wide task completion: total done tasks over total tasks,
  // across every project that has a checklist at all.
  const allTasks = projects.flatMap((p) => p.tasks || []);
  const completedTasks = allTasks.filter((t) => t.done).length;
  const overallProgress =
    allTasks.length === 0
      ? 0
      : Math.round((completedTasks / allTasks.length) * 100);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Workflow</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeProjects.length} active project
            {activeProjects.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-white">{overallProgress}%</p>
          <p className="text-[10px] text-slate-500">tasks complete</p>
        </div>
      </div>

      {/* Overall task progress bar */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-sky-500 rounded-full transition-all"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Stage breakdown — single-line scrollable strip, same pattern
          as ScheduleSummary's category chips. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGE_KEYS.map((stage) => {
          const count = stageCounts[stage] || 0;

          return (
            <div
              key={stage}
              className={`
                flex-shrink-0 flex items-center gap-2
                px-3 py-2 rounded-lg
                ${count > 0 ? STAGE_SOFT_CLASSES[stage] : "bg-slate-800/60 text-slate-600"}
              `}
            >
              <span className="text-sm">{STAGE_ICONS[stage]}</span>
              <div className="leading-tight">
                <p className="text-sm font-bold">{count}</p>
                <p className="text-[9px] whitespace-nowrap opacity-80">
                  {STAGE_LABELS[stage]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowSummary;