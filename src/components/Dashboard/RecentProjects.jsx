import { useEffect, useState } from "react";
import { FaCamera } from "react-icons/fa";

import { supabase } from "../../lib/supabaseClient";
import { STAGE_LABELS, getTaskProgress } from "../Workflow/workflowStages";
import { CATEGORY_LABELS } from "../Schedule/eventCategory";

const STAGE_DOT = {
  "shoot-completed": "bg-violet-500",
  editing: "bg-amber-500",
  completed: "bg-teal-500",
  delivered: "bg-emerald-500",
  "paid-completed": "bg-slate-500",
};

function RecentProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("projects")
        .select("*, project_tasks(*)")
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Failed to load recent projects:", error.message);
        setProjects([]);
        setLoading(false);
        return;
      }

      const mapped = data.map((row) => ({
        id: row.id,
        client: row.client,
        category: CATEGORY_LABELS[row.category] || row.category,
        stage: row.stage,
        progress: getTaskProgress({
          tasks: (row.project_tasks || []).map((t) => ({ done: t.done })),
        }),
      }));

      setProjects(mapped);
      setLoading(false);
    };

    fetchProjects();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          Recent Projects
        </h3>
        <button className="text-xs text-sky-400 hover:text-sky-300">
          View all
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm py-6 text-center">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FaCamera className="text-slate-700 text-2xl mb-2" />
          <p className="text-slate-500 text-sm">No projects yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-3">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  STAGE_DOT[project.stage] || "bg-slate-500"
                }`}
              />

              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">
                  {project.client}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {project.category} · {STAGE_LABELS[project.stage] || "Unknown"}
                </p>
              </div>

              <span className="text-xs text-slate-500 flex-shrink-0">
                {project.progress}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentProjects;