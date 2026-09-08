import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { STAGE_KEYS, STAGE_LABELS } from "../Workflow/workflowStages";

const STAGE_COLORS = {
  "shoot-completed": "bg-violet-500",
  editing: "bg-amber-500",
  completed: "bg-teal-500",
  delivered: "bg-emerald-500",
  "paid-completed": "bg-slate-500",
};

// "coming-events" is never actually stored in the projects table — it's
// a virtual stage Workflow builds live from unlinked schedule events —
// so it's excluded here since there's nothing in `projects` to count.
const SUMMARY_STAGES = STAGE_KEYS.filter((key) => key !== "coming-events");

function WorkflowSummary() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      const { data, error } = await supabase.from("projects").select("stage");

      if (error) {
        console.error("Failed to load workflow summary:", error.message);
        setLoading(false);
        return;
      }

      const tally = {};
      SUMMARY_STAGES.forEach((key) => (tally[key] = 0));
      data.forEach((row) => {
        if (tally[row.stage] !== undefined) tally[row.stage] += 1;
      });

      setCounts(tally);
      setLoading(false);
    };

    fetchCounts();
  }, []);

  const total = SUMMARY_STAGES.reduce(
    (sum, key) => sum + (counts[key] || 0),
    0
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Workflow Summary
      </h3>

      <div className="space-y-2.5">
        {SUMMARY_STAGES.map((key) => {
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