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
import AddProjectModal from "../components/Workflow/Addprojectmodal";

function WorkflowPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // =========================================================
  // LOAD PROJECTS (+ NESTED TASKS) FROM SUPABASE, AND MERGE IN
  // UPCOMING SCHEDULE EVENTS THAT HAVEN'T BEEN PROMOTED YET
  // =========================================================
  //
  // The Schedule tab writes to `schedule_events`, with `project_id` null
  // until an event is linked to (or promoted into) a real project. Any
  // event dated today or later with no project yet shows up here as a
  // Coming Events card tagged "From Schedule."

  const fetchUpcomingEvents = async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("schedule_events")
      .select("*")
      .gte("start_time", startOfToday.toISOString())
      .is("project_id", null)
      .order("start_time", { ascending: true });

    if (error) {
      // Don't hard-fail the whole page if this query fails — just skip
      // the merge and show whatever real projects loaded fine.
      console.error("Failed to load schedule events:", error.message);
      return [];
    }

    return data.map((ev) => ({
      id: `event-${ev.id}`,
      eventId: ev.id,
      clientId: ev.client_id,
      client: ev.client || ev.title,
      category: ev.category,
      date: new Date(ev.start_time).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      dateRaw: ev.start_time,
      notes: ev.notes,
      stage: "coming-events",
      tasks: [],
      isScheduleEvent: true,
    }));
  };

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

    const upcomingEvents = await fetchUpcomingEvents();

    setProjects([...mapped, ...upcomingEvents]);
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

  const handleSaveProject = async (form) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    if (form.id) {
      const { error } = await supabase
        .from("projects")
        .update({
          client: form.client,
          category: form.category,
          event_date: form.date,
          stage: form.stage,
          notes: form.notes,
        })
        .eq("id", form.id);

      if (error) {
        console.error("Failed to update project:", error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projects").insert([
        {
          user_id: user.id,
          client: form.client,
          category: form.category,
          event_date: form.date,
          stage: form.stage || STAGE_KEYS[0],
          notes: form.notes || "",
        },
      ]);

      if (error) {
        console.error("Failed to create project:", error.message);
        return;
      }
    }

    setModalOpen(false);
    setEditingProject(null);
    await fetchProjects();
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  // =========================================================
  // RESYNC OR REMOVE A CLIENT AFTER THEIR EVENTS CHANGE
  // =========================================================
  //
  // `clients.project` / `venue` / `category` are a snapshot written
  // from the Schedule tab whenever an event is saved — it's what
  // ClientPage falls back to display when a client has no *current*
  // events. If the client still has other events left, we just
  // refresh that snapshot to the next one. If they have none at all,
  // the client record itself is deleted — including any manually
  // entered contact info, email, or notes — rather than left behind
  // as an empty shell. This is a deliberate, confirmed choice: there
  // is no "keep the client but empty" middle ground here.

  const syncOrRemoveClient = async (clientId) => {
    if (!clientId) return;

    const { data: remainingEvents, error } = await supabase
      .from("schedule_events")
      .select("title, location, category, start_time")
      .eq("client_id", clientId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(
        "Failed to check remaining events for client:",
        error.message
      );
      return;
    }

    if (!remainingEvents || remainingEvents.length === 0) {
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (deleteError) {
        console.error(
          "Failed to delete client with no remaining events:",
          deleteError.message
        );
      }

      return;
    }

    const now = new Date();
    const upcoming = remainingEvents.filter(
      (event) => new Date(event.start_time) >= now
    );

    const active = upcoming[0] || remainingEvents[remainingEvents.length - 1];

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        project: active?.title || null,
        venue: active?.location || null,
        category: active?.category || null,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error(
        "Failed to update client project snapshot:",
        updateError.message
      );
    }
  };

  const handleDeleteProject = async (id) => {
    const project = projects.find((p) => p.id === id);

    if (!project) return;

    // "Coming Events" cards aren't real project rows — they're just
    // unlinked schedule_events surfaced here (see fetchUpcomingEvents
    // above). There's nothing in the `projects` table to delete; the
    // thing to delete is the schedule_events row itself, which is
    // also what makes it disappear from the Schedule tab.
    if (project.isScheduleEvent) {
      const { error } = await supabase
        .from("schedule_events")
        .delete()
        .eq("id", project.eventId);

      if (error) {
        console.error("Failed to delete schedule event:", error.message);
        return;
      }

      await syncOrRemoveClient(project.clientId);
      await fetchProjects();
      return;
    }

    // Real project row. Find every client whose event links to this
    // project before we delete those events, so we know who to
    // resync afterward.
    const { data: linkedEvents, error: linkedFetchError } = await supabase
      .from("schedule_events")
      .select("client_id")
      .eq("project_id", id);

    if (linkedFetchError) {
      console.error(
        "Failed to look up events linked to this project:",
        linkedFetchError.message
      );
      return;
    }

    // If it was promoted from a schedule event (see handleMoveStage
    // below), that event still points project_id at this project —
    // delete it too so it disappears from Schedule as well, not just
    // here.
    const { error: eventsDeleteError } = await supabase
      .from("schedule_events")
      .delete()
      .eq("project_id", id);

    if (eventsDeleteError) {
      console.error(
        "Failed to delete schedule events linked to this project:",
        eventsDeleteError.message
      );
      return;
    }

    const affectedClientIds = [
      ...new Set((linkedEvents || []).map((e) => e.client_id).filter(Boolean)),
    ];

    for (const clientId of affectedClientIds) {
      await syncOrRemoveClient(clientId);
    }

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete project:", error.message);
      return;
    }

    await fetchProjects();
  };

  // Moves a card to targetStage. For a real project row this just updates
  // `stage`. For a card pulled in from Schedule (isScheduleEvent), clicking
  // "Event Finished" promotes it into an actual project row and links the
  // event back to it so it won't show up as "upcoming" again.
  //
  // Guard: a schedule-derived card can only be promoted once its shoot
  // date has arrived (today or earlier) — it can't be pushed forward
  // while the shoot is still in the future, even if the button in the
  // UI is somehow bypassed.
  const handleMoveStage = async (id, targetStage) => {
    if (!targetStage) return;

    const project = projects.find((p) => p.id === id);
    if (!project) return;

    if (project.isScheduleEvent) {
      const eventDate = new Date(project.dateRaw);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOfEventDay = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );

      if (startOfEventDay > startOfToday) {
        console.error(
          "Cannot promote a shoot that hasn't happened yet:",
          project.client
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No authenticated user found.");
        return;
      }

      const { data: newProject, error: insertErr } = await supabase
        .from("projects")
        .insert([
          {
            user_id: user.id,
            client: project.client,
            category: project.category,
            event_date: project.dateRaw,
            stage: targetStage,
            notes: project.notes || "",
          },
        ])
        .select()
        .single();

      if (insertErr) {
        console.error("Failed to promote event to project:", insertErr.message);
        return;
      }

      const { error: linkErr } = await supabase
        .from("schedule_events")
        .update({ project_id: newProject.id })
        .eq("id", project.eventId);

      if (linkErr) {
        console.error("Failed to link event to new project:", linkErr.message);
      }
    } else {
      const { error } = await supabase
        .from("projects")
        .update({ stage: targetStage })
        .eq("id", id);

      if (error) {
        console.error("Failed to move project stage:", error.message);
        return;
      }
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

      <div className="workflow-container">
        {loading ? (
          <p className="text-slate-400 px-2">Loading projects...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
            {STAGE_KEYS.map((stage) => {
              const stageProjects = projectsByStage[stage] || [];

              return (
                <div
                  key={stage}
                  className={`
                    min-w-0
                    bg-slate-50 border border-slate-200
                    border-t-2 ${STAGE_COLUMN_BORDER[stage]}
                    rounded-xl p-3
                    dark:bg-slate-900/60 dark:border-slate-800
                  `}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {STAGE_LABELS[stage]}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono flex-shrink-0 ml-1">
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
            })}
          </div>
        )}
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