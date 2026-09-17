import { useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaPlus,
  FaTrash,
  FaPen,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

import { CATEGORY_LABELS, CATEGORY_SOFT_BADGE_CLASSES } from "../Schedule/eventCategory";
import { getAdjacentStage, getTaskProgress } from "./workflowStages";

// =========================================================
// PROJECT CARD
// =========================================================
// One card per client project. Handles its own "is the checklist
// expanded" state locally — everything else (stage, tasks) lives in
// the parent so WorkflowPage stays the single source of truth for data.
function ProjectCard({
  project,
  onMoveStage,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onEdit,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);
  const [newTask, setNewTask] = useState("");

  const progress = getTaskProgress(project);
  const taskCount = project.tasks?.length || 0;

  const prevStage = getAdjacentStage(project.stage, "prev");
  const nextStage = getAdjacentStage(project.stage, "next");

  const handleAddTask = (e) => {
    e.preventDefault();
    const text = newTask.trim();
    if (!text) return;

    onAddTask(project.id, text);
    setNewTask("");
  };

  return (
    <div
      className="
        bg-white
        border
        border-slate-200
        rounded-lg
        p-3
        shadow-sm
        hover:border-sky-300
        transition
        dark:bg-slate-800
        dark:border-slate-700
        dark:hover:border-slate-600
      "
    >
      {/* =================================================
          HEADER: client + category + edit/delete
          ================================================= */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate dark:text-white">
            {project.client}
          </p>
          {project.date && (
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(project.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(project)}
            className="workflow-card-action w-6 h-6 rounded-md flex items-center justify-center bg-transparent text-slate-700 transition hover:bg-slate-100 hover:text-sky-600"
            title="Edit project"
          >
            <FaPen className="text-[11px]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            className="workflow-card-action w-6 h-6 rounded-md flex items-center justify-center bg-transparent text-slate-700 transition hover:bg-slate-100 hover:text-rose-500"
            title="Delete project"
          >
            <FaTrash className="text-[11px]" />
          </button>
        </div>
      </div>

      {/* CATEGORY BADGE */}

      {project.category && (
        <span
          className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-2 ${
            CATEGORY_SOFT_BADGE_CLASSES[project.category] ||
            CATEGORY_SOFT_BADGE_CLASSES.default
          }`}
        >
          {CATEGORY_LABELS[project.category] || CATEGORY_LABELS.default}
        </span>
      )}

      {/* =================================================
          TASK PROGRESS
          ================================================= */}

      {taskCount > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>
              {project.tasks.filter((t) => t.done).length} / {taskCount} tasks
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* =================================================
          CHECKLIST TOGGLE
          ================================================= */}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 transition py-1 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <span>Checklist</span>
        {expanded ? (
          <FaChevronUp className="text-[10px]" />
        ) : (
          <FaChevronDown className="text-[10px]" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {(project.tasks || []).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 group"
            >
              <button
                type="button"
                onClick={() => onToggleTask(project.id, task.id)}
                className={`
                  w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition
                  ${
                    task.done
                      ? "bg-sky-500 border-sky-500"
                      : "border-slate-300 hover:border-sky-500 dark:border-slate-600"
                  }
                `}
              >
                {task.done && <FaCheck className="text-[8px] text-slate-900" />}
              </button>

              <span
                className={`text-xs flex-1 truncate ${
                  task.done ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {task.text}
              </span>

              <button
                type="button"
                onClick={() => onDeleteTask(project.id, task.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 transition flex-shrink-0 dark:text-slate-600 dark:hover:text-rose-400"
              >
                <FaTrash className="text-[9px]" />
              </button>
            </div>
          ))}

          {/* ADD TASK */}

          <form onSubmit={handleAddTask} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task..."
              className="
                flex-1
                bg-white
                border
                border-slate-200
                rounded-md
                px-2
                py-1
                text-xs
                text-slate-900
                placeholder-slate-500
                outline-none
                focus:border-sky-500
                dark:bg-slate-900
                dark:border-slate-700
                dark:text-white
                dark:placeholder-slate-600
              "
            />
            <button
              type="submit"
              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-sky-500 hover:text-slate-900 text-slate-700 flex items-center justify-center transition flex-shrink-0 dark:bg-slate-700 dark:text-slate-300"
            >
              <FaPlus className="text-[9px]" />
            </button>
          </form>
        </div>
      )}

      {/* =================================================
          MOVE STAGE CHEVRONS
          ================================================= */}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
        <button
          type="button"
          disabled={!prevStage}
          onClick={() => onMoveStage(project.id, prevStage)}
          className="
            workflow-stage-action
            w-7 h-7 rounded-md
            flex items-center justify-center
            bg-transparent
            text-slate-700
            hover:bg-slate-100
            hover:text-slate-900
            disabled:opacity-20
            disabled:hover:bg-transparent
            transition
          "
          title="Move to previous stage"
        >
          <FaChevronLeft className="text-xs" />
        </button>

        <span className="text-[10px] text-slate-500 font-mono dark:text-slate-600">
          {project.project_code}
        </span>

        <button
          type="button"
          disabled={!nextStage}
          onClick={() => onMoveStage(project.id, nextStage)}
          className="
            workflow-stage-action
            w-7 h-7 rounded-md
            flex items-center justify-center
            bg-transparent
            text-slate-700
            hover:bg-slate-100
            hover:text-slate-900
            disabled:opacity-20
            disabled:hover:bg-transparent
            transition
          "
          title="Move to next stage"
        >
          <FaChevronRight className="text-xs" />
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;