import React from "react";

function StatCard({
  title,
  value,
  icon,
  subtitle,
  subtitleColor = "text-slate-500",
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 transition hover:-translate-y-1 hover:shadow-xl">

      <div className="flex justify-between items-center mb-2">

        <span className="text-slate-400 text-xs sm:text-sm">
          {title}
        </span>

        <div className="text-sky-500 text-lg">
          {icon}
        </div>

      </div>

      <h3 className="text-2xl sm:text-3xl font-bold text-white">
        {value}
      </h3>

      <p className={`text-xs mt-1 ${subtitleColor}`}>
        {subtitle}
      </p>

    </div>
  );
}

export default StatCard;