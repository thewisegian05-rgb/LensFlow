import { useOutletContext } from "react-router-dom";
import Section from "../components/ui/Section";
import MyBookings from "../../../components/Schedule/MyBookings";
import EventProgress from "./EventProgress";

const HERO_IMG =
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=85";

export default function HomeTab() {
  const { goTo, activeId, reload } = /** @type {any} */ (useOutletContext());

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

      {/* Priority: your upcoming bookings (replaces the My Bookings sidebar page) */}
      <Section title="My Bookings" dot="bg-violet-400">
        <MyBookings photographerId={activeId} refreshKey={0} onChanged={reload} futureOnly />
      </Section>

      {/* Progress of the client's confirmed events (follows the photographer's Workflow tab) */}
      <EventProgress activeId={activeId} goTo={goTo} />
    </div>
  );
}