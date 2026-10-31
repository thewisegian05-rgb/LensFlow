
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { STAGE_LABELS, getTaskProgress } from "../Workflow/workflowStages";
import {
  getEventCategory,
  CATEGORY_HEX,
  CATEGORY_LABELS,
} from "../Schedule/eventCategory";

// Same category colors the Calendar and Schedule lists use.
const hexToRgba = (hex, alpha = 1) => {
  const normalized = (hex || "#d946ef").replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const value = Number.parseInt(safeHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

      const mapped = data.map((row) => {
        const category = getEventCategory({
          title: row.client || "",
          client: row.client || "",
          category: row.category,
        });

        return {
          id: row.id,
          client: row.client,
          categoryLabel: CATEGORY_LABELS[category] || row.category,
          hex: CATEGORY_HEX[category] || CATEGORY_HEX.default,
          stage: row.stage,
          progress: getTaskProgress({
            tasks: (row.project_tasks || []).map((t) => ({
              done: t.done,
            })),
          }),
        };
      });

      setProjects(mapped);
      setLoading(false);
    };

    fetchProjects();
  }, []);

  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900">
      {/* Header - matches Upcoming Schedule */}
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Recent Projects
        </h3>

        <button className="text-xs text-sky-400 transition hover:text-sky-300">
          View all
        </button>
      </header>

      {/* Content - matches Upcoming Schedule */}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <p className="flex h-[200px] flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-center text-sm text-slate-500">
            No projects yet.
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  backgroundColor: hexToRgba(project.hex, 0.1),
                  borderColor: hexToRgba(project.hex, 0.3),
                  borderLeftColor: project.hex,
                  color: project.hex,
                }}
                className="flex items-center gap-3 rounded-lg border border-l-4 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {project.client}
                  </p>

                  <p className="truncate text-xs opacity-70">
                    {[
                      project.categoryLabel,
                      STAGE_LABELS[project.stage] || "Unknown",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <span className="flex-shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {project.progress}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentProjects;
