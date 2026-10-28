import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  FaUsers,
  FaCalendarDay,
  FaHourglassHalf,
  FaPhotoVideo,
  FaFolder,
  FaCoins,
  FaCalendarCheck,
  FaInbox,
} from "react-icons/fa";

import UpcomingSchedule from "./UpcomingSchedule";
import RecentProjects from "./RecentProjects";
import WorkflowSummary from "./WorkflowSummary";
import RevenueChart from "./RevenueChart";
import BookingRequests from "../Schedule/BookingRequests";

import { supabase } from "../../lib/supabaseClient";

const peso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;

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

/* -------------- Stat cell (sits inside the Overview panel) ------------- */
function StatCell({
  title,
  value, // number | null (null shows a dash)
  subtitle,
  icon,
  iconClass,
  dot = "bg-slate-600",
  loading,
  index = 0,
  format = (n) => String(n),
}) {
  const animated = useCountUp(value, !loading);

  // Loading state: skeleton with the same size as the real cell
  if (loading) {
    return (
      <div className="bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-500/20" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-500/20" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-500/15" />
          </div>
          <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-slate-500/20" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="group dash-reveal cursor-default bg-slate-900 p-5 transition-colors duration-300 hover:bg-slate-500/10"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 origin-left transition-transform duration-300 ease-out group-hover:scale-[1.07]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <h3 className="mt-2 text-3xl font-bold tabular-nums text-white">
            {value === null ? "–" : format(animated)}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} />
            <span className="truncate">{subtitle}</span>
          </p>
        </div>

        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm transition-transform duration-300 ease-out group-hover:scale-[1.15] ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* Makes whatever is inside grow a little when the mouse is over it */
function Grow({ wide = false, children }) {
  return (
    <div
      className={`relative h-full transition-transform duration-300 ease-out hover:z-10 ${
        wide ? "hover:scale-[1.01]" : "hover:scale-[1.025]"
      }`}
    >
      {children}
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

function Dashboard() {
  const { reportPageReady, routeKey } = useOutletContext();
  const [stats, setStats] = useState({
    clientsToday: 0,
    pendingClients: 0,
    editing: 0,
    totalFolders: 0,
    monthFees: null,
    upcomingFees: null,
    heldDownpayments: 0,
    requests: null,
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

      // Money. "Collected" is cash actually received this month (by payment date).
      // "To collect" is what clients still owe. Not essential, so a failure
      // here just shows a dash.
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
      let upcomingFees = null;
      let heldDownpayments = 0;

      const { data: monthPayments, error: monthPayError } = await supabase
        .from("event_payments")
        .select("amount")
        .gte("paid_at", startOfMonth.toISOString())
        .lt("paid_at", startOfNextMonth.toISOString());

      if (monthPayError) {
        console.error("Failed to load collected fees:", monthPayError.message);
      } else {
        monthFees = monthPayments.reduce(
          (sum, row) => sum + (Number(row.amount) || 0),
          0
        );
      }

      const { data: allEvents, error: allEventsError } = await supabase
        .from("schedule_events")
        .select("talent_fee, start_time, status, event_payments(amount)");

      if (allEventsError) {
        console.error("Failed to load balances:", allEventsError.message);
      } else {
        const nowMs = Date.now();
        upcomingFees = 0;

        allEvents.forEach((ev) => {
          if (ev.status === "cancelled") return; // downpayment kept, nothing owed

          const collected = (ev.event_payments || []).reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          );

          upcomingFees += Math.max((Number(ev.talent_fee) || 0) - collected, 0);

          // Money already received for shoots that have not happened yet.
          if (new Date(ev.start_time).getTime() > nowMs) heldDownpayments += collected;
        });
      }

      // Client booking requests still waiting for your quote.
      let requests = null;

      const { count: requestCount, error: requestError } = await supabase
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (requestError) {
        console.error("Failed to load booking requests:", requestError.message);
      } else {
        requests = requestCount || 0;
      }

      setStats({
        clientsToday,
        pendingClients,
        editing,
        totalFolders: folderCount || 0,
        monthFees,
        upcomingFees,
        heldDownpayments,
        requests,
      });
      setLoadingStats(false);
    };

    fetchStats().catch((error) => {
      console.error("Failed to load dashboard statistics:", error);
      setLoadingStats(false);
    });
  }, []);

  // Tell the shared layout overlay when this route's essential stats are ready.
  useEffect(() => {
    if (!loadingStats) {
      reportPageReady(routeKey);
    }
  }, [loadingStats, reportPageReady, routeKey]);

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
        <div className="mb-4 h-0.5 w-full overflow-hidden rounded bg-slate-500/20">
          <div className="dash-loadbar h-full w-1/3 rounded bg-sky-400" />
        </div>
      )}

      {/* Header (same pattern as the Schedule page) */}
      <div className="mb-5">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 min-h-[1.5rem] text-slate-400">
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

      {/* New client booking requests (only shows when there are some) */}
      <BookingRequests hideWhenEmpty />

      {/* Overview: one connected panel, divided by thin lines */}
      <section className="mb-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Overview
          </h3>
          <span className="text-xs text-slate-500">Live from your schedule</span>
        </header>

        <div className="grid grid-cols-1 gap-px bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <StatCell
            index={0}
            loading={loadingStats}
            title="Total Clients"
            value={totalClients}
            subtitle={totalClients === 0 ? "No clients yet" : "Today + upcoming"}
            dot="bg-sky-400"
            icon={<FaUsers />}
            iconClass="bg-sky-500/10 text-sky-400"
          />
          <StatCell
            index={1}
            loading={loadingStats}
            title="Clients Today"
            value={stats.clientsToday}
            subtitle={stats.clientsToday === 0 ? "Nothing today" : "On the schedule"}
            dot="bg-amber-400"
            icon={<FaCalendarDay />}
            iconClass="bg-amber-500/10 text-amber-400"
          />
          <StatCell
            index={2}
            loading={loadingStats}
            title="Pending Clients"
            value={stats.pendingClients}
            subtitle={stats.pendingClients === 0 ? "None pending" : "From tomorrow on"}
            dot="bg-sky-400"
            icon={<FaHourglassHalf />}
            iconClass="bg-sky-500/10 text-sky-400"
          />
          <StatCell
            index={3}
            loading={loadingStats}
            title="Booking Requests"
            value={stats.requests}
            subtitle={
              stats.requests === 0 ? "All caught up" : "Awaiting your quote"
            }
            dot={stats.requests > 0 ? "bg-rose-400" : "bg-emerald-400"}
            icon={<FaInbox />}
            iconClass="bg-rose-500/10 text-rose-400"
          />
          <StatCell
            index={4}
            loading={loadingStats}
            title="Collected This Month"
            value={stats.monthFees}
            format={(n) => `₱${n.toLocaleString("en-PH")}`}
            subtitle="Cash received this month"
            dot="bg-sky-400"
            icon={<FaCoins />}
            iconClass="bg-sky-500/10 text-sky-400"
          />
          <StatCell
            index={5}
            loading={loadingStats}
            title="To Collect"
            value={stats.upcomingFees}
            format={(n) => `₱${n.toLocaleString("en-PH")}`}
            subtitle={
              stats.heldDownpayments > 0
                ? `${peso(stats.heldDownpayments)} held as downpayments`
                : "Balance owed on events"
            }
            dot="bg-emerald-400"
            icon={<FaCalendarCheck />}
            iconClass="bg-emerald-500/10 text-emerald-400"
          />
          <StatCell
            index={6}
            loading={loadingStats}
            title="Projects Editing"
            value={stats.editing}
            subtitle={stats.editing === 0 ? "Nothing in editing" : "In progress"}
            dot="bg-sky-400"
            icon={<FaPhotoVideo />}
            iconClass="bg-sky-500/10 text-sky-400"
          />
          <StatCell
            index={7}
            loading={loadingStats}
            title="Total Folders"
            value={stats.totalFolders}
            subtitle={stats.totalFolders === 0 ? "No folders yet" : "Across Media Storage"}
            dot="bg-sky-400"
            icon={<FaFolder />}
            iconClass="bg-sky-500/10 text-sky-400"
          />
        </div>
      </section>

      {/* The day-to-day info comes first */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Reveal delay={200} className="lg:col-span-2">
          <UpcomingSchedule />
        </Reveal>
        <Reveal delay={260} className="h-full">
          <Grow>
            <RecentProjects />
          </Grow>
        </Reveal>
      </div>

      <Reveal delay={320} className="mb-4">
        <Grow wide>
          <WorkflowSummary />
        </Grow>
      </Reveal>

      <Reveal delay={380}>
        <RevenueChart />
      </Reveal>
    </div>
  );
}

export default Dashboard;