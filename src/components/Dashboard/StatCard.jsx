import React from "react";

const ACCENT_STYLES = {
  sky: { bar: "bg-sky-500", icon: "text-sky-400 bg-sky-500/10" },
  amber: { bar: "bg-amber-500", icon: "text-amber-400 bg-amber-500/10" },
  violet: { bar: "bg-violet-500", icon: "text-violet-400 bg-violet-500/10" },
  emerald: { bar: "bg-emerald-500", icon: "text-emerald-400 bg-emerald-500/10" },
  rose: { bar: "bg-rose-500", icon: "text-rose-400 bg-rose-500/10" },
  indigo: { bar: "bg-indigo-500", icon: "text-indigo-400 bg-indigo-500/10" },
};

function StatCard({ title, value, icon, subtitle, accent = "sky" }) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.sky;

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-lg pl-4 pr-3 py-3 overflow-hidden transition hover:border-slate-700">
      <span
        className={`absolute left-0 top-0 h-full w-[3px] ${styles.bar}`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 leading-none">
            {value}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
        </div>

        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default StatCard;