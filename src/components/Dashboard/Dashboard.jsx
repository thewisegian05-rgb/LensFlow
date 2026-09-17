import { useEffect, useState } from "react";
import {
  FaUsers,
  FaCalendarDay,
  FaHourglassHalf,
  FaPhotoVideo,
  FaCoins,
  FaFolder,
} from "react-icons/fa";

import StatCard from "./StatCard";
import TodaySchedule from "./TodaySchedule";
import RecentProjects from "./RecentProjects";
import WorkflowSummary from "./WorkflowSummary";
import RevenueChart from "./RevenueChart";

import { supabase } from "../../lib/supabaseClient";

function Dashboard() {
  const [stats, setStats] = useState({
    clientsToday: 0,
    pendingClients: 0,
    editing: 0,
    totalFolders: 0,
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

      setStats({
        clientsToday,
        pendingClients,
        editing,
        totalFolders: folderCount || 0,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, []);

  // Total Clients = Clients Today + Pending Clients
  const totalClients = stats.clientsToday + stats.pendingClients;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <StatCard
          title="Total Clients"
          value={loadingStats ? "…" : String(totalClients)}
          icon={<FaUsers />}
          accent="sky"
          subtitle={
            totalClients === 0 ? "No clients yet" : "Today + upcoming"
          }
        />

        <StatCard
          title="Clients Today"
          value={loadingStats ? "…" : String(stats.clientsToday)}
          icon={<FaCalendarDay />}
          accent="rose"
          subtitle={
            stats.clientsToday === 0 ? "Nothing today" : "To attend to"
          }
        />

        <StatCard
          title="Pending Clients"
          value={loadingStats ? "…" : String(stats.pendingClients)}
          icon={<FaHourglassHalf />}
          accent="amber"
          subtitle={
            stats.pendingClients === 0 ? "None pending" : "From tomorrow on"
          }
        />

        <StatCard
          title="Projects Editing"
          value={loadingStats ? "…" : String(stats.editing)}
          icon={<FaPhotoVideo />}
          accent="violet"
          subtitle={
            stats.editing === 0 ? "Nothing in editing" : "In progress"
          }
        />

        <StatCard
          title="Total Folders"
          value={loadingStats ? "…" : String(stats.totalFolders)}
          icon={<FaFolder />}
          accent="indigo"
          subtitle={
            stats.totalFolders === 0 ? "No folders yet" : "Across Media Storage"
          }
        />

        <StatCard
          title="Approx. Income"
          value="₱0"
          icon={<FaCoins />}
          accent="emerald"
          subtitle="Pricing not tracked yet"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <TodaySchedule />
        <RecentProjects />
        <WorkflowSummary />
      </div>

      <RevenueChart />
    </div>
  );
}

export default Dashboard;