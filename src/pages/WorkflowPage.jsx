import { useMemo, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";

import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_COLUMN_BORDER,
} from "../components/Workflow/workflowStages";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "../components/Schedule/eventCategory";
import ProjectCard from "../components/Workflow/ProjectCard";
import AddProjectModal from "../components/Workflow/AddProjectModal";

// =========================================================
// SAMPLE DATA
// =========================================================
// Placeholder seed so the board isn't empty on first load. Swap this
// out for real data (API call, context, etc.) — the rest of the page
// only depends on `projects` having this shape:
// { id, client, category, date, stage, notes, tasks: [{id, text, done}] }
const SAMPLE_PROJECTS = [
  {
    id: "PRJ-001",
    client: "Chen × Rivera",
    category: "wedding",
    date: "2026-08-18",
    stage: "editing",
    notes: "",
    tasks: [
      { id: "t1", text: "Cull raw files", done: true },
      { id: "t2", text: "Color grade highlights", done: true },
      { id: "t3", text: "Export final gallery", done: false },
    ],
  },
  {
    id: "PRJ-002",
    client: "Amara Okafor",
    category: "portrait-lifestyle",
    date: "2026-08-10",
    stage: "booked",
    notes: "",
    tasks: [{ id: "t1", text: "Confirm location", done: false }],
  },
  {
    id: "PRJ-003",
    client: "Vertex Brand Co.",
    category: "product-business",
    date: "2026-08-05",
    stage: "review",
    notes: "",
    tasks: [
      { id: "t1", text: "Send proof gallery", done: true },
      { id: "t2", text: "Collect client picks", done: false },
    ],
  },
  {
    id: "PRJ-004",
    client: "The Hendersons",
    category: "family-milestones",
    date: "2026-07-28",
    stage: "delivered",
    notes: "",
    tasks: [{ id: "t1", text: "Deliver final files", done: true }],
  },
];

let nextId = SAMPLE_PROJECTS.length + 1;

function WorkflowPage() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // =========================================================
  // FILTERING
  // =========================================================

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query || project.client.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "all" || project.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [projects, search, categoryFilter]);

  // Group the filtered list by stage once, rather than re-filtering
  // the full array inside every column on every render.
  const projectsByStage = useMemo(() => {
    const grouped = {};
    STAGE_KEYS.forEach((key) => {
      grouped[key] = [];
    });

    filteredProjects.forEach((project) => {
      if (grouped[project.stage]) {
        grouped[project.stage].push(project);
      }
    });

    return grouped;
  }, [filteredProjects]);

  // =========================================================
  // PROJECT ACTIONS
  // =========================================================

  const handleSaveProject = (form) => {
    if (form.id) {
      setProjects((prev) =>
        prev.map((p) => (p.id === form.id ? { ...p, ...form } : p))
      );
    } else {
      setProjects((prev) => [
        ...prev,
        {
          ...form,
          id: `PRJ-${String(nextId++).padStart(3, "0")}`,
          tasks: [],
        },
      ]);
    }

    setModalOpen(false);
    setEditingProject(null);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleDeleteProject = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMoveStage = (id, targetStage) => {
    if (!targetStage) return;

    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage: targetStage } : p))
    );
  };

  // =========================================================
  // TASK ACTIONS
  // =========================================================

  const handleToggleTask = (projectId, taskId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;

        return {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t
          ),
        };
      })
    );
  };

  const handleAddTask = (projectId, text) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;

        return {
          ...p,
          tasks: [
            ...(p.tasks || []),
            { id: `t-${Date.now()}`, text, done: false },
          ],
        };
      })
    );
  };

  const handleDeleteTask = (projectId, taskId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;

        return {
          ...p,
          tasks: p.tasks.filter((t) => t.id !== taskId),
        };
      })
    );
  };

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="p-6">
      {/* =================================================
          HEADER
          ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflow</h1>
          <p className="text-slate-400 mt-1">
            Track every project from inquiry to delivery.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setModalOpen(true);
          }}
          className="
            px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600
            text-slate-900 font-semibold transition
            flex items-center gap-2 self-start md:self-auto
          "
        >
          <FaPlus className="text-xs" /> New Project
        </button>
      </div>

      {/* =================================================
          FILTER BAR
          ================================================= */}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client..."
            className="
              w-full bg-slate-900 border border-slate-700 rounded-lg
              pl-9 pr-3 py-2.5 text-white placeholder-slate-500
              outline-none focus:border-sky-500
            "
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="
            bg-slate-900 border border-slate-700 rounded-lg
            px-3 py-2.5 text-white outline-none focus:border-sky-500
          "
        >
          <option value="all">All Categories</option>
          {CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* =================================================
          KANBAN BOARD
          ================================================= */}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_KEYS.map((stage) => {
          const stageProjects = projectsByStage[stage] || [];

          return (
            <div
              key={stage}
              className={`
                flex-shrink-0 w-[280px]
                bg-slate-900/60 border border-slate-800
                border-t-2 ${STAGE_COLUMN_BORDER[stage]}
                rounded-xl p-3
              `}
            >
              {/* COLUMN HEADER */}

              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-white">
                  {STAGE_LABELS[stage]}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {stageProjects.length}
                </span>
              </div>

              {/* CARDS */}

              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {stageProjects.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-6">
                    No projects here yet.
                  </p>
                )}

                {stageProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onMoveStage={handleMoveStage}
                    onToggleTask={handleToggleTask}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================
          ADD / EDIT MODAL
          ================================================= */}

      <AddProjectModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        editingProject={editingProject}
      />
    </div>
  );
}

export default WorkflowPage;