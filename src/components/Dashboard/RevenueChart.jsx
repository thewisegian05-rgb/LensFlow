import { FaChartLine } from "react-icons/fa";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";


function RevenueChart({ data = [] }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-semibold text-white">
          Revenue Overview
        </h3>

        <span className="text-sm text-slate-400">
          Last 6 Months
        </span>
      </div>

      <div className="h-72">
        {data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FaChartLine className="mb-4 text-4xl text-slate-600" />
              <p className="text-base text-slate-400">
                No revenue data available.
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Revenue will appear here once projects are completed.
              </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
              />

              <XAxis
                dataKey="month"
                stroke="#94a3b8"
              />

              <YAxis
                stroke="#94a3b8"
              />

              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                }}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{
                  r: 5,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default RevenueChart;