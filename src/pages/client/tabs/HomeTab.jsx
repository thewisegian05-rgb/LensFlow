import { FaMapMarkerAlt, FaChevronRight, FaCalendarAlt, FaRegImages, FaUser, FaHeart, FaCameraRetro } from "react-icons/fa";
import { useOutletContext } from "react-router-dom";
import Stars from "../components/ui/Stars";
import Avatar from "../components/ui/Avatar";
import Section from "../components/ui/Section";
import { getProfile } from "../utils/portalUrls";

const HERO_IMG =
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=85";

export default function HomeTab() {
  const { portal, goTo } = /** @type {any} */ (useOutletContext());
  const profile = getProfile(portal);
  const name = profile.display_name || profile.username || profile.name || "Photographer";

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

      {/* Profile + rating */}
      <section className="lf-reveal min-w-0 rounded-2xl border border-slate-700/80 bg-gradient-to-r from-[#102338] to-[#0B1628] p-4 shadow-sm shadow-black/10 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="lf-ring h-[88px] w-[88px]">
            <Avatar path={profile.avatar_path} name={name} className="h-full w-full rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h3 className="text-xl font-bold text-white">{name}</h3>
              <span className="flex items-center gap-2 text-sm">
                <Stars value={portal.rating_avg} />
                <span className="font-semibold tabular-nums text-white">
                  {portal.rating_count > 0 ? Number(portal.rating_avg).toFixed(1) : "No ratings"}
                </span>
                {portal.rating_count > 0 && (
                  <span className="text-xs text-slate-500">
                    ({portal.rating_count} review{portal.rating_count !== 1 ? "s" : ""})
                  </span>
                )}
              </span>
            </div>
            {(profile.tagline || profile.bio_title) && (
              <p className="mt-1 text-sm text-sky-300">{profile.tagline || profile.bio_title}</p>
            )}
            {profile.location && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <FaMapMarkerAlt className="text-slate-500" /> {profile.location}
              </p>
            )}
            {profile.bio && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {profile.bio}
              </p>
            )}
            {profile.specialties?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Shortcuts to other tabs */}
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <section className="lf-reveal group flex min-h-[190px] items-center justify-between gap-4 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#10263D] via-[#0D1D30] to-[#0B1628] p-5 transition duration-300 hover:border-sky-400/40 sm:p-6">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1 w-7 rounded-full bg-sky-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                Plan your next session
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">Book a Schedule</h3>
            <p className="mt-2 max-w-[230px] text-sm leading-relaxed text-slate-400">
              Check availability and plan your session.
            </p>
            <button
              type="button"
              onClick={() => goTo("schedule")}
              className="lf-cta mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#0B1628]"
            >
              View Calendar
              <FaChevronRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="lf-float flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-sky-400/15 bg-sky-400/10 text-3xl text-sky-400 transition group-hover:bg-sky-400/15 sm:h-24 sm:w-24">
            <FaCalendarAlt />
          </div>
        </section>

        <section className="lf-reveal group flex min-h-[190px] items-center justify-between gap-4 overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#2A2210] via-[#1B1A12] to-[#0B1628] p-5 transition duration-300 hover:border-amber-300/40 sm:p-6"
          style={{ "--d": "120ms" }}>
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1 w-7 rounded-full bg-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                See the style
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">Featured Works</h3>
            <p className="mt-2 max-w-[230px] text-sm leading-relaxed text-slate-400">
              Browse the photographer's best shots.
            </p>
            <button
              type="button"
              onClick={() => goTo("portfolio")}
              className="lf-btn mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#0B1628]"
            >
              Open Portfolio
              <FaChevronRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="lf-float flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-amber-300/15 bg-amber-300/10 text-3xl text-amber-300 transition sm:h-24 sm:w-24">
            <FaRegImages />
          </div>
        </section>
      </div>

      {/* About photographer */}
      <Section title="About the Photographer" dot="bg-sky-400">
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-center">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
            {profile.bio ||
              profile.tagline ||
              "Discover the photographer's style, specialties, and approach to capturing your moments."}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(profile.specialties?.length
              ? profile.specialties.slice(0, 4)
              : ["Events", "Portraits", "Weddings", "Lifestyle"]
            ).map((specialty, index) => {
              const icons = [FaCalendarAlt, FaUser, FaHeart, FaCameraRetro];
              const Icon = icons[index % icons.length];
              return (
                <div
                  key={specialty}
                  className="flex flex-col items-center rounded-xl border border-slate-800 bg-[#0B1628] px-2 py-3 text-center"
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-lg text-sky-400">
                    <Icon />
                  </span>
                  <span className="text-xs font-semibold text-white">{specialty}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}