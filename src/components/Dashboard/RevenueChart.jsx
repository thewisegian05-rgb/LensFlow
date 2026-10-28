import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { FaChartLine, FaChartBar, FaDownload } from "react-icons/fa";

import { supabase } from "../../lib/supabaseClient";

const FUTURE_MONTHS = 24; // upcoming months shown after the current one (Months view)

// Width of one column on the scrollable chart, per view.
const COLUMN_PX = { D: 52, M: 96, Y: 150 };

const peso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const yearKey = (d) => String(d.getFullYear());

const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const KEY_FN = { D: dayKey, M: monthKey, Y: yearKey };

// Money model (per column):
//   total     = Booked      -> full fee, in the month of the EVENT
//   completed = Collected   -> cash actually received, in the month it was PAID
//   upcoming  = Outstanding -> fee minus payments, in the month of the EVENT
// A cancelled event keeps only what was paid (downpayments are non-refundable).
const METRICS = [
  { id: "total", label: "Booked Fees", money: true, fee: true, get: (m) => m.total },
  { id: "completed", label: "Collected", money: true, fee: true, get: (m) => m.completed },
  { id: "upcoming", label: "Outstanding", money: true, fee: true, get: (m) => m.upcoming },
  { id: "events", label: "Events Booked", money: false, get: (m) => m.events },
  {
    id: "avg",
    label: "Average Fee",
    money: true,
    get: (m) => (m.events ? m.total / m.events : 0),
  },
];

const FEE_LINES = [
  { key: "total", name: "Booked", color: "#38bdf8" },
  { key: "completed", name: "Collected", color: "#34d399" },
  { key: "upcoming", name: "Outstanding", color: "#fbbf24", dashed: true },
];

const GRANS = [
  { id: "D", label: "Days" },
  { id: "M", label: "Months" },
  { id: "Y", label: "Years" },
];

const RANGES = [
  { id: "6m", label: "6M" },
  { id: "12m", label: "12M" },
  { id: "ytd", label: "This year" },
  { id: "all", label: "All" },
];

const fmt = (metric, v) => (metric.money ? peso(v) : String(Math.round(v)));

// Chart geometry, shared by the chart and the frozen Y axis labels.
const CHART_HEIGHT = 288; // Tailwind h-72
const CHART_TOP = 16; // chart margin.top
const X_AXIS_HEIGHT = 30;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_TOP - X_AXIS_HEIGHT;

// One shared Y scale, so the frozen axis on the left lines up exactly with the
// scrolling chart (both use the same domain and ticks).
function niceScale(max, money) {
  const safeMax = max > 0 ? max : money ? 1000 : 4;
  const rough = safeMax / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
  if (!money) step = Math.max(1, Math.round(step));
  const top = Math.ceil(safeMax / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 100) / 100);
  return { max: top, ticks };
}

// Build the list of columns (days, months or years) the chart and table show.
function buildBuckets(gran, range) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const list = [];
  let start;
  let endExclusive;

  if (gran === "D") {
    // 30 days back, 180 days ahead (scroll to see them all)
    for (let i = -30; i <= 180; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      list.push({
        key: dayKey(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        current: i === 0,
        future: i > 0,
      });
    }
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    endExclusive = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 181);
  } else if (gran === "Y") {
    // 5 years back, 5 years ahead (scroll to see them all)
    const y = now.getFullYear();
    for (let i = y - 5; i <= y + 5; i += 1) {
      list.push({ key: String(i), label: String(i), current: i === y, future: i > y });
    }
    start = new Date(y - 5, 0, 1);
    endExclusive = new Date(y + 6, 0, 1);
  } else {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let first;
    let last;

    if (range === "ytd") {
      first = new Date(now.getFullYear(), 0, 1);
      last = new Date(now.getFullYear(), 11, 1);
    } else {
      const back = range === "6m" ? 5 : range === "12m" ? 11 : 35;
      first = addMonths(thisMonth, -back);
      last = addMonths(thisMonth, FUTURE_MONTHS);
    }

    for (let d = first; d <= last; d = addMonths(d, 1)) {
      const key = monthKey(d);
      list.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        current: key === monthKey(now),
        future: key > monthKey(now),
      });
    }
    start = first;
    endExclusive = addMonths(last, 1);
  }

  return { list, start, endExclusive };
}

const EMPTY = { total: 0, completed: 0, upcoming: 0, events: 0 };

const sumPayments = (list) => (list || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

function aggregate(events, payments, keyFn) {
  const map = new Map();

  const slotFor = (key) => {
    let slot = map.get(key);
    if (!slot) {
      slot = { ...EMPTY };
      map.set(key, slot);
    }
    return slot;
  };

  events.forEach((ev) => {
    const collected = sumPayments(ev.event_payments);
    const cancelled = ev.status === "cancelled";
    const fee = cancelled ? collected : Number(ev.talent_fee) || 0;
    const slot = slotFor(keyFn(new Date(ev.start_time)));

    slot.total += fee;
    slot.events += 1;
    slot.upcoming += cancelled ? 0 : Math.max(fee - collected, 0);
  });

  payments.forEach((p) => {
    slotFor(keyFn(new Date(p.paid_at))).completed += Number(p.amount) || 0;
  });

  return map;
}

// Events (with their payments) by event date, plus payments by paid date.
async function fetchRevenue(from, to) {
  const [ev, pay] = await Promise.all([
    supabase
      .from("schedule_events")
      .select("id, talent_fee, start_time, status, event_payments(amount)")
      .gte("start_time", from.toISOString())
      .lt("start_time", to.toISOString()),
    supabase
      .from("event_payments")
      .select("amount, paid_at")
      .gte("paid_at", from.toISOString())
      .lt("paid_at", to.toISOString()),
  ]);

  return {
    events: ev.data || [],
    payments: pay.data || [],
    error: ev.error || pay.error || null,
  };
}

function RevenueChart({ refreshTick = 0 }) {
  const [gran, setGran] = useState("M");
  const [range, setRange] = useState("12m");
  const [metricId, setMetricId] = useState("total");
  const [chartType, setChartType] = useState("line");
  const [rows, setRows] = useState({ events: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadedOnce = useRef(false); // only the first load shows the skeleton

  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0];
  const buckets = useMemo(() => buildBuckets(gran, range), [gran, range]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!loadedOnce.current) setLoading(true);
      setError("");

      const now = new Date();
      const twelveBack = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const from = buckets.start < twelveBack ? buckets.start : twelveBack;

      const result = await fetchRevenue(from, buckets.endExclusive);

      if (cancelled) return;

      if (result.error) {
        console.error("Failed to load revenue:", result.error.message);
        setError(result.error.message);
        setRows({ events: [], payments: [] });
      } else {
        setRows({ events: result.events, payments: result.payments });
      }
      loadedOnce.current = true;
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [buckets, refreshTick]);

  // Totals per column of the chart / table.
  const byBucket = useMemo(
    () => aggregate(rows.events, rows.payments, KEY_FN[gran]),
    [rows, gran]
  );
  // The right-hand column always looks at months and years, whatever view
  // is selected, so it loads its own wider window: 2 years back, 12 months ahead.
  const [sideRows, setSideRows] = useState({ events: [], payments: [] });
  const [sideLoading, setSideLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const now = new Date();
      const from = new Date(now.getFullYear() - 2, 0, 1);
      const to = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), 13);

      const result = await fetchRevenue(from, to);

      if (cancelled) return;

      if (result.error) {
        console.error("Failed to load revenue summary:", result.error.message);
      } else {
        setSideRows({ events: result.events, payments: result.payments });
      }
      setSideLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const sideByMonth = useMemo(
    () => aggregate(sideRows.events, sideRows.payments, monthKey),
    [sideRows]
  );

  const columns = useMemo(
    () => buckets.list.map((b) => ({ ...b, ...(byBucket.get(b.key) || EMPTY) })),
    [buckets, byBucket]
  );

  const chartData = columns.map((c) => ({
    name: c.label,
    total: c.total,
    completed: c.completed,
    upcoming: c.upcoming,
    value: metric.get(c),
  }));

  const currentLabel = columns.find((c) => c.current)?.label;

  // ---- horizontal scrolling of the chart ----
  const scrollRef = useRef(null);

  const scrollToToday = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;

    const idx = columns.findIndex((c) => c.current);
    if (idx < 0) return;

    const colWidth = el.scrollWidth / columns.length;
    const target = idx * colWidth - el.clientWidth / 3;
    el.scrollTo({ left: Math.max(0, target), behavior: smooth ? "smooth" : "auto" });
  };

  const scrollByDir = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  // Start each view centered near today.
  useEffect(() => {
    if (loading) return;
    scrollToToday(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gran, range, chartType]);

  const chartWidth = columns.length * COLUMN_PX[gran];

  const inView = useMemo(
    () => ({
      collected: columns.reduce((s, c) => s + c.completed, 0),
      outstanding: columns.reduce((s, c) => s + c.upcoming, 0),
    }),
    [columns]
  );

  // Right-hand column: coming months, this month, and past months per year.
  const sidebar = useMemo(() => {
    const now = new Date();
    const cy = now.getFullYear();
    const thisMonth = new Date(cy, now.getMonth(), 1);

    const slot = (d) => sideByMonth.get(monthKey(d)) || EMPTY;
    const merge = (list) =>
      list.reduce(
        (a, s) => ({
          total: a.total + s.total,
          completed: a.completed + s.completed,
          upcoming: a.upcoming + s.upcoming,
          events: a.events + s.events,
        }),
        { ...EMPTY }
      );

    // Next 12 months after this one
    const comingSlots = [];
    for (let i = 1; i <= 12; i += 1) {
      const d = addMonths(thisMonth, i);
      comingSlots.push({
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        slot: slot(d),
      });
    }

    const coming = comingSlots
      .filter((c) => c.slot.events > 0)
      .slice(0, 6)
      .map((c) => ({ label: c.label, value: metric.get(c.slot) }));

    const comingTotal = metric.get(merge(comingSlots.map((c) => c.slot)));

    // Past months, grouped per year (this year = Jan up to last month)
    const years = [];
    for (let y = cy; y >= cy - 2; y -= 1) {
      const lastMonth = y === cy ? now.getMonth() - 1 : 11;
      const slots = [];
      for (let m = 0; m <= lastMonth; m += 1) slots.push(slot(new Date(y, m, 1)));

      let label = String(y);
      if (y === cy) {
        label =
          lastMonth < 0
            ? `${y} (so far)`
            : `${y} (Jan–${new Date(y, lastMonth, 1).toLocaleDateString("en-US", { month: "short" })})`;
      }

      years.push({ year: y, label, value: metric.get(merge(slots)) });
    }

    return { current: metric.get(slot(thisMonth)), coming, comingTotal, years };
  }, [metric, sideByMonth]);

  function exportCsv() {
    const header = ["Period", ...METRICS.map((m) => m.label)];
    const lines = columns.map((c) => [c.label, ...METRICS.map((m) => Math.round(m.get(c)))]);
    const csv = [header, ...lines].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasData = columns.some((c) => c.events > 0 || c.completed > 0);
  const multi = Boolean(metric.fee);

  const axisFmt = (v) =>
    metric.money ? (v >= 1000 ? `₱${+(v / 1000).toFixed(1)}k` : `₱${v}`) : String(v);

  const yMax = Math.max(
    0,
    ...chartData.map((d) => (multi ? Math.max(d.total, d.completed, d.upcoming) : d.value))
  );
  const yScale = niceScale(yMax, metric.money);

  // Tooltip stays dark in both themes so it is always readable.
  const tooltipStyle = {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#e2e8f0",
  };

  // Theme-neutral chart chrome: inherits text color via currentColor and
  // uses opacity, so it works in light and dark mode.
  const axisTick = { fill: "currentColor", fillOpacity: 0.6 };

  const todayMarker = currentLabel ? (
    <ReferenceLine
      x={currentLabel}
      stroke="currentColor"
      strokeOpacity={0.4}
      strokeDasharray="4 4"
      label={{
        value: "Today",
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        position: "top",
      }}
    />
  ) : null;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900">
      {/* Title row */}
      <header className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-xl font-bold text-white">Revenue Overview</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Talent fees from your events · Whole range:{" "}
            <span className="text-emerald-400">{peso(inView.collected)} collected</span> ·{" "}
            <span className="text-amber-400">{peso(inView.outstanding)} outstanding</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
            {GRANS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGran(g.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  gran === g.id ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {gran === "M" && (
            <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    range === r.id ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {error && <p className="px-5 pt-3 text-xs text-red-400">Could not load revenue: {error}</p>}

      <div className="grid gap-0 lg:grid-cols-[13rem_minmax(0,1fr)_14rem]">
        {/* Left: metric list */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 p-3 lg:flex-col lg:border-b-0 lg:border-r">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetricId(m.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
                metricId === m.id
                  ? "bg-slate-800 font-semibold text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>

        {/* Middle: chart */}
        <div className="min-w-0 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              {multi ? "Booked, collected & outstanding" : metric.label}
            </p>
            <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => scrollByDir(-1)}
                aria-label="Scroll left"
                className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => scrollToToday(true)}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => scrollByDir(1)}
                aria-label="Scroll right"
                className="rounded-md px-2 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                ▶
              </button>
              <span className="mx-1 w-px bg-slate-700" />
              <button
                type="button"
                onClick={() => setChartType("line")}
                aria-label="Line chart"
                className={`rounded-md p-1.5 text-xs ${
                  chartType === "line" ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <FaChartLine />
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                aria-label="Bar chart"
                className={`rounded-md p-1.5 text-xs ${
                  chartType === "bar" ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                <FaChartBar />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-lg bg-slate-800/60" />
          ) : !hasData ? (
            <p className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-700 text-center text-sm text-slate-500">
              No events with fees in this period yet.
            </p>
          ) : (
            <div className="flex text-slate-500">
              {/* Frozen Y axis: plain labels lined up with the chart's gridlines */}
              <div className="relative h-72 w-14 flex-shrink-0">
                {yScale.ticks.map((t) => (
                  <span
                    key={t}
                    className="absolute right-2 -translate-y-1/2 whitespace-nowrap text-[11px] tabular-nums opacity-70"
                    style={{ top: CHART_TOP + (1 - t / yScale.max) * PLOT_HEIGHT }}
                  >
                    {axisFmt(t)}
                  </span>
                ))}
              </div>
              <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto pb-2">
                <div className="h-72" style={{ minWidth: "100%", width: chartWidth }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "line" ? (
                      <LineChart
                        data={chartData}
                        margin={{ top: CHART_TOP, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} />
                        <XAxis
                          dataKey="name"
                          stroke="currentColor"
                          strokeOpacity={0.3}
                          tick={axisTick}
                          fontSize={11}
                          height={X_AXIS_HEIGHT}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          width={0}
                          tick={false}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, yScale.max]}
                          ticks={yScale.ticks}
                        />
                        <Tooltip
                          formatter={(v, name) => [fmt(metric, v), name]}
                          contentStyle={tooltipStyle}
                        />
                        {todayMarker}
                        {multi ? (
                          <>
                            {FEE_LINES.map((l) => (
                              <Line
                                key={l.key}
                                type="monotone"
                                dataKey={l.key}
                                name={l.name}
                                stroke={l.color}
                                strokeWidth={metricId === l.key ? 3 : 2}
                                strokeDasharray={l.dashed ? "6 4" : undefined}
                                strokeOpacity={metricId === l.key || metricId === "total" ? 1 : 0.45}
                                dot={{ r: 3 }}
                              />
                            ))}
                          </>
                        ) : (
                          <Line
                            type="monotone"
                            dataKey="value"
                            name={metric.label}
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        )}
                      </LineChart>
                    ) : (
                      <BarChart
                        data={chartData}
                        margin={{ top: CHART_TOP, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} />
                        <XAxis
                          dataKey="name"
                          stroke="currentColor"
                          strokeOpacity={0.3}
                          tick={axisTick}
                          fontSize={11}
                          height={X_AXIS_HEIGHT}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          width={0}
                          tick={false}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, yScale.max]}
                          ticks={yScale.ticks}
                        />
                        <Tooltip
                          formatter={(v, name) => [fmt(metric, v), name]}
                          contentStyle={tooltipStyle}
                          cursor={{ fill: "currentColor", fillOpacity: 0.08 }}
                        />
                        {todayMarker}
                        {multi ? (
                          <>
                            <Bar dataKey="total" name="Booked" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="completed" name="Collected" fill="#34d399" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="upcoming" name="Outstanding" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                          </>
                        ) : (
                          <Bar dataKey="value" name={metric.label} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Legend stays put while the chart scrolls */}
          {!loading && hasData && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              {multi ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-sky-400" /> Booked
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-emerald-400" /> Collected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-amber-400" /> Outstanding
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-sky-400" /> {metric.label}
                </span>
              )}
              <span className="text-slate-600">· Scroll sideways to see more</span>
            </div>
          )}
        </div>

        {/* Right: coming months, this month, past months per year */}
        <aside className="space-y-4 border-t border-slate-800 p-4 lg:border-l lg:border-t-0">
          {/* Coming months */}
          <div>
            <p className="text-xs text-slate-500">Coming months</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">
              {sideLoading ? "–" : fmt(metric, sidebar.comingTotal)}
            </p>

            {!sideLoading && (
              <div className="mt-2 space-y-1">
                {sidebar.coming.length === 0 ? (
                  <p className="text-xs text-slate-600">Nothing booked yet.</p>
                ) : (
                  sidebar.coming.map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{c.label}</span>
                      <span className="font-semibold tabular-nums">{fmt(metric, c.value)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* This month */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500">This month</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">
              {sideLoading ? "–" : fmt(metric, sidebar.current)}
            </p>
          </div>

          {/* Past months, per year */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500">Past months (per year)</p>
            <div className="mt-2 space-y-3">
              {sidebar.years.map((y) => (
                <div key={y.year}>
                  <p className="text-xs text-slate-500">{y.label}</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-400">
                    {sideLoading ? "–" : fmt(metric, y.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom: chart data table */}
      <div className="border-t border-slate-800 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-bold text-white">Chart data</h4>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!hasData}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
          >
            <FaDownload className="text-[10px]" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-500/10 text-xs text-slate-500">
                <th className="sticky left-0 z-10 border-r border-slate-800 bg-slate-900 px-4 py-2 font-medium">Metric</th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`whitespace-nowrap px-4 py-2 text-right font-medium ${
                      c.current ? "text-sky-400" : ""
                    }`}
                  >
                    {c.label}
                    {c.future && <span className="ml-1 text-[9px] text-slate-600">upcoming</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-800/70 last:border-0 ${i % 2 ? "bg-slate-500/10" : ""}`}
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-slate-800 bg-slate-900 px-4 py-2.5 font-medium">
                    {row.label}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums opacity-80"
                    >
                      {loading ? "–" : fmt(row, row.get(c))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default RevenueChart;