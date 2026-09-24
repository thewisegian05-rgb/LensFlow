import { useState } from "react";
import { FaCheck, FaEdit, FaPlus, FaTrash } from "react-icons/fa";

import {
  STAGE_BADGE_CLASSES,
  STAGE_LABELS,
  getTaskProgress,
} from "./workflowStages";

function ProjectCard({
  project,
  onMoveStage,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onEdit,
  onDelete,
}) {
  const [taskInput, setTaskInput] = useState("");
  const progress = getTaskProgress(project);

  const handleAddTask = () => {
    const nextTask = taskInput.trim();
    if (!nextTask) return;
    onAddTask(project.id, nextTask);
    setTaskInput("");
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 shadow-lg shadow-slate-950/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {project.project_code || project.id}
          </p>
          <h4 className="mt-1 text-base font-semibold text-white truncate">
            {project.client}
          </h4>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(project)}
            className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            aria-label="Edit project"
          >
            <FaEdit className="text-xs" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            className="p-1.5 rounded-md bg-slate-800 text-rose-300 hover:bg-rose-500/15 transition"
            aria-label="Delete project"
          >
            <FaTrash className="text-xs" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${STAGE_BADGE_CLASSES[project.stage] || "bg-slate-500"}`}
        >
          {STAGE_LABELS[project.stage] || project.stage}
        </span>

        {project.date && (
          <span className="text-[10px] text-slate-400">{project.date}</span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Checklist</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {project.tasks?.length ? (
          project.tasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5"
            >
              <button
                type="button"
                onClick={() => onToggleTask(project.id, task.id)}
                className={`flex h-4 w-4 items-center justify-center rounded-sm border transition ${
                  task.done
                    ? "border-emerald-500 bg-emerald-500 text-slate-950"
                    : "border-slate-600 bg-slate-800 text-transparent"
                }`}
                aria-label={task.done ? "Mark task incomplete" : "Mark task complete"}
              >
                {task.done && <FaCheck className="text-[8px]" />}
              </button>

              <span
                className={`text-xs flex-1 ${task.done ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}
              >
                {task.text}
              </span>

              <button
                type="button"
                onClick={() => onDeleteTask(project.id, task.id)}
                className="text-slate-500 hover:text-rose-400 transition"
                aria-label="Delete task"
              >
                <FaTrash className="text-[10px]" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-500">No tasks yet.</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 min-w-0">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTask();
            }
          }}
          placeholder="Add task"
          className="
            min-w-0 flex-1
            bg-white border border-slate-300
            rounded-lg px-2.5 py-1.5
            text-xs text-slate-700
            placeholder-slate-400
            outline-none focus:border-sky-500
            dark:bg-slate-900 dark:border-slate-700
            dark:text-white dark:placeholder-slate-500
          "
        />

        <button
          type="button"
          onClick={handleAddTask}
          className="
            flex-shrink-0
            inline-flex items-center justify-center
            rounded-lg bg-sky-500 p-2
            text-slate-900 hover:bg-sky-400
            transition
          "
          aria-label="Add task"
        >
          <FaPlus className="text-[10px]" />
        </button>
      </div>

      {project.stage === "shoot-completed" && (
        <button
          type="button"
          onClick={() => onMoveStage(project.id, "editing")}
          className="w-full mt-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
        >
          Start Edit
        </button>
      )}

      {project.stage === "editing" && (
        <button
          type="button"
          onClick={() => onMoveStage(project.id, "delivered")}
          className="w-full mt-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold text-sm transition"
        >
          Album Sent
        </button>
      )}
    </div>
  );
}

export default ProjectCard;