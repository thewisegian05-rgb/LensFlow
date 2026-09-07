import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";

import { supabase } from "../lib/supabaseClient";
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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // =========================================================
  // LOAD PROJECTS (+ NESTED TASKS) FROM SUPABASE
  // =========================================================

  const fetchProjects = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*, project_tasks(*)")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load projects:", error.message);
      setLoading(false);
      return;
    }

    const mapped = data.map((row) => ({
      id: row.id,
      project_code: row.project_code,
      client: row.client,
      category: row.category,
      date: row.event_date,
      stage: row.stage,
      notes: row.notes,
      tasks: (row.project_tasks || [])
        .sort((a, b) => a.position - b.position)
        .map((t) => ({ id: t.id, text: t.text, done: t.done })),
    }));

    setProjects(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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

  const handleDeleteProject = async (id) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete project:", error.message);
      return;
    }

    await fetchProjects();
  };

  const handleMoveStage = async (id, targetStage) => {
    if (!targetStage) return;

    const { error } = await supabase
      .from("projects")
      .update({ stage: targetStage })
      .eq("id", id);

    if (error) {
      console.error("Failed to move project stage:", error.message);
      return;
    }

    await fetchProjects();
  };

  // =========================================================
  // TASK ACTIONS
  // =========================================================

  const handleToggleTask = async (projectId, taskId) => {
    const project = projects.find((p) => p.id === projectId);
    const task = project?.tasks.find((t) => t.id === taskId);

    if (!task) return;

    const { error } = await supabase
      .from("project_tasks")
      .update({ done: !task.done })
      .eq("id", taskId);

    if (error) {
      console.error("Failed to toggle task:", error.message);
      return;
    }

    await fetchProjects();
  };

  const handleAddTask = async (projectId, text) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    const project = projects.find((p) => p.id === projectId);
    const position = project?.tasks.length || 0;

    const { error } = await supabase.from("project_tasks").insert([
      {
        project_id: projectId,
        user_id: user.id,
        text,
        done: false,
        position,
      },
    ]);

    if (error) {
      console.error("Failed to add task:", error.message);
      return;
    }

    await fetchProjects();
  };

  const handleDeleteTask = async (projectId, taskId) => {
    const { error } = await supabase
      .from("project_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("Failed to delete task:", error.message);
      return;
    }

    await fetchProjects();
  };

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="p-6">
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

      <div className="workflow-container custom-scrollbar">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {loading ? (
            <p className="text-slate-400 px-2">Loading projects...</p>
          ) : (
            STAGE_KEYS.map((stage) => {
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
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-white">
                      {STAGE_LABELS[stage]}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      {stageProjects.length}
                    </span>
                  </div>

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
            })
          )}
        </div>
      </div>

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