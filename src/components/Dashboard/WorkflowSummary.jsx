import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { STAGE_KEYS, STAGE_LABELS } from "../Workflow/workflowStages";

// Same stage colors as the Workflow board columns.
const STAGE_COLORS = {
  "coming-events": "bg-sky-500",
  "today-event": "bg-amber-500",
  "shoot-completed": "bg-violet-500",
  editing: "bg-orange-500",
  "edit-complete": "bg-indigo-500",
  delivered: "bg-teal-500",
  completed: "bg-emerald-500",
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
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Workflow Summary
        </h3>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
          {loading ? "…" : total}
        </span>
      </header>

      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {STAGE_KEYS.map((key) => {
          const count = counts[key] || 0;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);

          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-400">{STAGE_LABELS[key]}</span>
                <span className="font-semibold text-white">
                  {loading ? "…" : count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    STAGE_COLORS[key] || "bg-sky-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default WorkflowSummary;