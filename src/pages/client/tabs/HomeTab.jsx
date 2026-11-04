import { FaChevronRight, FaInbox } from "react-icons/fa";
import { useOutletContext } from "react-router-dom";
import EventProgress from "./EventProgress";

const HERO_IMG =
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=85";

// ASSUMPTION: adjust to match your real portal data shape.
const getRequests = (portal) =>
  portal.booking_requests || portal.bookingRequests || portal.requests || [];

const STATUS_STYLES = {
  pending: "bg-amber-400/10 text-amber-300",
  approved: "bg-emerald-400/10 text-emerald-300",
  confirmed: "bg-emerald-400/10 text-emerald-300",
  declined: "bg-rose-400/10 text-rose-300",
  cancelled: "bg-rose-400/10 text-rose-300",
};

function BookingRequests({ requests, goTo }) {
  const pendingCount = requests.filter((r) => (r.status || "pending") === "pending").length;

  return (
    <section className="min-w-0 rounded-2xl border border-amber-400/25 bg-gradient-to-r from-[#2A2210] via-[#1B1A12] to-[#0B1628] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
            <FaInbox />
          </span>
          <h2 className="text-base font-semibold text-white">Booking requests</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => goTo("schedule")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300 rounded"
        >
          View all <FaChevronRight className="text-[10px]" />
        </button>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
          No booking requests yet. Pick a date in the calendar to send one.
        </p>
      ) : (
        <ul className="space-y-2">
          {requests.slice(0, 3).map((r, i) => {
            const status = (r.status || "pending").toLowerCase();
            return (
              <li
                key={r.id ?? i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0B1628]/80 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {r.title || r.event_name || r.package_name || "Booking request"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.date || r.event_date || r.requested_date || "Date to be confirmed"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    STATUS_STYLES[status] || "bg-slate-500/10 text-slate-300"
                  }`}
                >
                  {status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function HomeTab() {
  const { portal, goTo, activeId } = /** @type {any} */ (useOutletContext());
  const requests = getRequests(portal);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {/* HERO with Ken Burns, viewfinder and focus-pull */}
      <section className="relative min-h-[220px] overflow-hidden rounded-2xl border border-slate-700 bg-[#10192C] sm:min-h-[260px]">
        <div
          className="lf-kenburns absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(5,12,24,.94) 0%, rgba(5,12,24,.72) 46%, rgba(5,12,24,.10) 100%), url('${HERO_IMG}')`,
          }}
          aria-hidden="true"
        />
        <span className="lf-vf lf-vf-tl" />
        <span className="lf-vf lf-vf-tr" />
        <span className="lf-vf lf-vf-bl" />
        <span className="lf-vf lf-vf-br" />
        <span className="absolute right-10 top-5 flex items-center gap-2 text-[10px] font-semibold tracking-widest text-slate-300">
          <span className="lf-rec" /> LIVE
        </span>
        <div className="relative flex min-h-[220px] max-w-3xl flex-col justify-center px-6 py-8 sm:min-h-[260px] sm:px-10">
          <p
            className="lf-rise mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300 sm:text-xs"
            style={{ "--d": "100ms" }}
          >
            <span className="h-0.5 w-8 bg-sky-400" /> Welcome to LensFlow
          </p>
          <h2 className="lf-focus-pull max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Capturing
            <br />
            Your <span className="lf-shimmer-text">Special Moments</span>
          </h2>
          <p className="lf-rise mt-4 text-sm text-slate-200 sm:text-base" style={{ "--d": "700ms" }}>
            Authentic photos for real stories.
          </p>
        </div>
      </section>

      {/* Priority: booking requests */}
      <BookingRequests requests={requests} goTo={goTo} />

      {/* Progress of the client's confirmed events (follows the photographer's Workflow tab) */}
      <EventProgress activeId={activeId} goTo={goTo} />
    </div>
  );
}