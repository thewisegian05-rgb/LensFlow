import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { STAGE_KEYS, STAGE_LABELS } from "../Workflow/workflowStages";

const STAGE_COLORS = {
  "coming-events": "bg-sky-500",
  "shoot-completed": "bg-violet-500",
  editing: "bg-amber-500",
  "edit-complete": "bg-teal-500",
  delivered: "bg-emerald-500",
  "paid-completed": "bg-slate-500",
};

function WorkflowSummary() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      const tally = {};
      STAGE_KEYS.forEach((key) => (tally[key] = 0));

      // Real pipeline stages come from `projects`.
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("stage");

      if (projectsError) {
        console.error("Failed to load workflow summary:", projectsError.message);
        setLoading(false);
        return;
      }

      projects.forEach((row) => {
        if (tally[row.stage] !== undefined) tally[row.stage] += 1;
      });

      // "Coming Events" is virtual — it's not a real projects.stage,
      // it's schedule events dated today or later that haven't been
      // promoted into a project yet. Same logic as the Workflow board's
      // Coming Events column.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { count: comingCount, error: comingError } = await supabase
        .from("schedule_events")
        .select("id", { count: "exact", head: true })
        .gte("start_time", startOfToday.toISOString())
        .is("project_id", null);

      if (comingError) {
        console.error("Failed to load coming events count:", comingError.message);
        setLoading(false);
        return;
      }

      tally["coming-events"] = comingCount || 0;

      setCounts(tally);
      setLoading(false);
    };

    fetchCounts();
  }, []);

  const total = STAGE_KEYS.reduce((sum, key) => sum + (counts[key] || 0), 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Workflow Summary
      </h3>

      <div className="space-y-2.5">
        {STAGE_KEYS.map((key) => {
          const count = counts[key] || 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);

          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">{STAGE_LABELS[key]}</span>
                <span className="text-white font-medium">
                  {loading ? "…" : count}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${STAGE_COLORS[key]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowSummary;