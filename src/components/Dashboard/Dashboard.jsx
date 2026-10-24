import { useEffect, useRef, useState } from "react";
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
import BookingRequests from "../Schedule/BookingRequests";

import { supabase } from "../../lib/supabaseClient";

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/* The animates can count up from 0 to target once ready*/
/* ------------------------------------------------------------------ */
function useCountUp(target, ready, duration = 900) {
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    if (!ready || target === null || target === undefined) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion || target === 0) {
      setDisplay(target);
      return;
    }

    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, ready, duration]);

  return display;
}

/* -------------- Stat card ------------- */
function StatCard({
  title,
  value, // number | null (null shows a dash)
  subtitle,
  icon,
  iconClass,
  loading,
  index = 0,
  format = (n) => String(n),
}) {
  const animated = useCountUp(value, !loading);

  // Loading state: skeleton with the same size as the real card
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-700/70" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-700/70" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-800" />
          </div>
          <div className="h-11 w-11 flex-shrink-0 animate-pulse rounded-lg bg-slate-700/70" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="dash-reveal rounded-xl border border-slate-700 bg-slate-900 p-5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-1 text-3xl font-bold tabular-nums text-white">
            {value === null ? "–" : format(animated)}
          </h3>
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

/* Wrapper that fades its children in (used for the lower sections) */
function Reveal({ delay = 0, className = "", children }) {
  return (
    <div
      className={`dash-reveal ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

  const dateLine = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      {/* Slim loading bar while the numbers are being fetched */}
      {loadingStats && (
        <div className="mb-4 h-0.5 w-full overflow-hidden rounded bg-slate-800">
          <div className="dash-loadbar h-full w-1/3 rounded bg-sky-400" />
        </div>
      )}

      {/* Header (same pattern as the Schedule page) */}
      <div className="mb-5">
        <h2 className="text-3xl font-bold text-white">
          Dashboard
        </h2>

        <p className="mt-2 text-lg font-medium text-sky-400">
          {getGreeting()}!
        </p>

        <p className="mt-1 text-sm text-slate-400">
          Welcome back to LensFlow Studio. Here's your overview for today.
        </p>

        <p className="mt-2 min-h-[1.5rem] text-slate-300">
          {dateLine}
          {!loadingStats && (
            <span className="dash-fade">
              {` · ${
                stats.clientsToday > 0
                  ? `${plural(stats.clientsToday, "client")} today`
                  : "Nothing scheduled today"
              }`}
            </span>
          )}
        </p>
      </div>


      {/* New client booking requests */}
      <BookingRequests />

      {/* Overview cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          index={0}
          loading={loadingStats}
          title="Total Clients"
          value={totalClients}
          subtitle={totalClients === 0 ? "No clients yet" : "Today + upcoming"}
          icon={<FaUsers />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          index={1}
          loading={loadingStats}
          title="Clients Today"
          value={stats.clientsToday}
          subtitle={stats.clientsToday === 0 ? "Nothing today" : "On the schedule"}
          icon={<FaCalendarDay />}
          iconClass="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          index={2}
          loading={loadingStats}
          title="Pending Clients"
          value={stats.pendingClients}
          subtitle={stats.pendingClients === 0 ? "None pending" : "From tomorrow on"}
          icon={<FaHourglassHalf />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          index={3}
          loading={loadingStats}
          title="Projects Editing"
          value={stats.editing}
          subtitle={stats.editing === 0 ? "Nothing in editing" : "In progress"}
          icon={<FaPhotoVideo />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          index={4}
          loading={loadingStats}
          title="Total Folders"
          value={stats.totalFolders}
          subtitle={stats.totalFolders === 0 ? "No folders yet" : "Across Media Storage"}
          icon={<FaFolder />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          index={5}
          loading={loadingStats}
          title="Fees This Month"
          value={stats.monthFees}
          format={(n) => `₱${n.toLocaleString("en-PH")}`}
          subtitle="From event fees"
          icon={<FaCoins />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Reveal delay={150}>
          <TodaySchedule />
        </Reveal>
        <Reveal delay={230}>
          <RecentProjects />
        </Reveal>
      </div>

      <Reveal delay={310} className="mb-4">
        <WorkflowSummary />
      </Reveal>

      <Reveal delay={390}>
        <RevenueChart />
      </Reveal>
    </div>
  );
}

export default Dashboard;