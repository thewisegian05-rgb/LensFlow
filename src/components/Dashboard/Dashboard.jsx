import { useEffect, useState } from "react";
import {
  FaUsers,
  FaCalendarDay,
  FaHourglassHalf,
  FaPhotoVideo,
  FaFolder,
  FaCoins,
} from "react-icons/fa";

import TodaySchedule from "./TodaySchedule";
import RecentProjects from "./RecentProjects";
import WorkflowSummary from "./WorkflowSummary";
import RevenueChart from "./RevenueChart";

import { supabase } from "../../lib/supabaseClient";

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Same card the Schedule page uses for its overview numbers.
function StatCard({ title, value, subtitle, icon, iconClass }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-1 text-3xl font-bold text-white">{value}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
        </div>

        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    clientsToday: 0,
    pendingClients: 0,
    editing: 0,
    totalFolders: 0,
    monthFees: null,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("stage");

      if (projectsError) {
        console.error("Failed to load project stats:", projectsError.message);
        setLoadingStats(false);
        return;
      }

      const editing = projects.filter((p) => p.stage === "editing").length;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      const { data: todayEvents, error: todayError } = await supabase
        .from("schedule_events")
        .select("client")
        .gte("start_time", startOfToday.toISOString())
        .lt("start_time", startOfTomorrow.toISOString());

      if (todayError) {
        console.error("Failed to load today's clients:", todayError.message);
        setLoadingStats(false);
        return;
      }

      const clientsToday = new Set(
        todayEvents.map((e) => e.client).filter(Boolean)
      ).size;

      const { data: pendingEvents, error: pendingError } = await supabase
        .from("schedule_events")
        .select("client")
        .gte("start_time", startOfTomorrow.toISOString())
        .is("project_id", null);

      if (pendingError) {
        console.error("Failed to load pending clients:", pendingError.message);
        setLoadingStats(false);
        return;
      }

      const pendingClients = new Set(
        pendingEvents.map((e) => e.client).filter(Boolean)
      ).size;

      const { count: folderCount, error: folderError } = await supabase
        .from("folders")
        .select("id", { count: "exact", head: true });

      if (folderError) {
        console.error("Failed to load folder count:", folderError.message);
        setLoadingStats(false);
        return;
      }

      // Fees booked this month: the sum of each event's talent fee.
      // Not essential, so a failure here just shows a dash.
      const startOfMonth = new Date(
        startOfToday.getFullYear(),
        startOfToday.getMonth(),
        1
      );
      const startOfNextMonth = new Date(
        startOfToday.getFullYear(),
        startOfToday.getMonth() + 1,
        1
      );

      let monthFees = null;

      const { data: feeRows, error: feeError } = await supabase
        .from("schedule_events")
        .select("talent_fee")
        .gte("start_time", startOfMonth.toISOString())
        .lt("start_time", startOfNextMonth.toISOString());

      if (feeError) {
        console.error("Failed to load monthly fees:", feeError.message);
      } else {
        monthFees = feeRows.reduce(
          (sum, row) => sum + (Number(row.talent_fee) || 0),
          0
        );
      }

      setStats({
        clientsToday,
        pendingClients,
        editing,
        totalFolders: folderCount || 0,
        monthFees,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, []);

  // Total Clients = Clients Today + Pending Clients
  const totalClients = stats.clientsToday + stats.pendingClients;

  const show = (value) => (loadingStats ? "…" : String(value));

  const dateLine = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      {/* Header (same pattern as the Schedule page) */}
      <div className="mb-5">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-slate-300">
          {dateLine}
          {!loadingStats &&
            ` · ${
              stats.clientsToday > 0
                ? `${plural(stats.clientsToday, "client")} today`
                : "Nothing scheduled today"
            }`}
        </p>
      </div>

      {/* Overview cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Clients"
          value={show(totalClients)}
          subtitle={totalClients === 0 ? "No clients yet" : "Today + upcoming"}
          icon={<FaUsers />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          title="Clients Today"
          value={show(stats.clientsToday)}
          subtitle={stats.clientsToday === 0 ? "Nothing today" : "On the schedule"}
          icon={<FaCalendarDay />}
          iconClass="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          title="Pending Clients"
          value={show(stats.pendingClients)}
          subtitle={stats.pendingClients === 0 ? "None pending" : "From tomorrow on"}
          icon={<FaHourglassHalf />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          title="Projects Editing"
          value={show(stats.editing)}
          subtitle={stats.editing === 0 ? "Nothing in editing" : "In progress"}
          icon={<FaPhotoVideo />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          title="Total Folders"
          value={show(stats.totalFolders)}
          subtitle={stats.totalFolders === 0 ? "No folders yet" : "Across Media Storage"}
          icon={<FaFolder />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          title="Fees This Month"
          value={
            loadingStats
              ? "…"
              : stats.monthFees === null
              ? "–"
              : `₱${stats.monthFees.toLocaleString("en-PH")}`
          }
          subtitle="From event fees"
          icon={<FaCoins />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <TodaySchedule />
        <RecentProjects />
      </div>

      <div className="mb-4">
        <WorkflowSummary />
      </div>

      <RevenueChart />
    </div>
  );
}

export default Dashboard;