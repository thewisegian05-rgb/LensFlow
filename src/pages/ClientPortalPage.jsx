import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaStar,
  FaRegStar,
  FaMapMarkerAlt,
  FaKey,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCameraRetro,
  FaRegImages,
  FaHome,
  FaCalendarAlt,
  FaUser,
  FaRegImage,
  FaHeart,
  FaFileAlt,
  FaSignOutAlt,
} from "react-icons/fa";

import Calendar from "../components/Schedule/Calendar";
import BookingModal from "../components/Schedule/BookingModal";
import MyBookings from "../components/Schedule/MyBookings";
import { supabase } from "../lib/supabaseClient";


/* ============ Scroll reveal hook (adds "lf-in" when a card scrolls into view) ============ */

function useScrollReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll(".lf-reveal:not(.lf-in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("lf-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lf-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/* ============ Portal animations (embedded, no extra file needed) ============ */
const PORTAL_CSS = `
/* ==========================================
   LENSFLOW CLIENT PORTAL, animations
   (same style as the Clients page; every name is
   prefixed lf- so nothing collides with Clients CSS)
========================================== */
:root {
  --lf-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --lf-ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
}
html { scroll-behavior: smooth; }

/* ==========================================
   KEYFRAMES
========================================== */
@keyframes lf-fade-up   { from { opacity: 0; transform: translateY(28px) scale(.97); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes lf-fade-down { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: none; } }
@keyframes lf-fade-in   { from { opacity: 0; } to { opacity: 1; } }
@keyframes lf-row-in    { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
@keyframes lf-modal-pop { from { opacity: 0; transform: scale(.94) translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes lf-pulse-dot { 0% { transform: scale(1); opacity: .6; } 70%, 100% { transform: scale(3.2); opacity: 0; } }
@keyframes lf-shimmer   { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

/* ==========================================
   PAGE LOAD
========================================== */
.lf-header-in { animation: lf-fade-down .7s var(--lf-ease-out-expo) backwards; }
.lf-rise      { animation: lf-fade-up .9s var(--lf-ease-out-expo) backwards; animation-delay: var(--d, 0ms); }

/* ==========================================
   AURORA BACKGROUND
========================================== */
.lf-orb { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .35; will-change: transform; }
.lf-orb-1 { width: 520px; height: 520px; top: -140px; left: -120px; background: #0ea5e9; animation: lf-drift-a 22s ease-in-out infinite alternate; }
.lf-orb-2 { width: 460px; height: 460px; top: 35%; right: -140px; background: #8b5cf6; opacity: .22; animation: lf-drift-b 28s ease-in-out infinite alternate; }
.lf-orb-3 { width: 400px; height: 400px; bottom: -160px; left: 30%; background: #10b981; opacity: .16; animation: lf-drift-c 32s ease-in-out infinite alternate; }
@keyframes lf-drift-a { to { transform: translate(180px, 120px) scale(1.15); } }
@keyframes lf-drift-b { to { transform: translate(-220px, -80px) scale(1.2); } }
@keyframes lf-drift-c { to { transform: translate(140px, -160px) scale(1.1); } }

/* ==========================================
   HERO
========================================== */
.lf-kenburns { animation: lf-kenburns 18s ease-in-out infinite alternate; transform-origin: 60% 40%; }
@keyframes lf-kenburns { from { transform: scale(1); } to { transform: scale(1.12) translate(-1.5%, -1%); } }

.lf-focus-pull { animation: lf-focus-pull 1.4s var(--lf-ease-out-expo) backwards; }
@keyframes lf-focus-pull {
  0%   { opacity: 0; filter: blur(18px); transform: scale(1.06); letter-spacing: .06em; }
  60%  { opacity: 1; }
  100% { opacity: 1; filter: blur(0); transform: scale(1); letter-spacing: normal; }
}

.lf-shimmer-text {
  background: linear-gradient(100deg, #38bdf8 20%, #e0f2fe 40%, #a78bfa 60%, #38bdf8 80%);
  background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: lf-text-shimmer 5s linear infinite;
}
@keyframes lf-text-shimmer { to { background-position: -250% 0; } }

.lf-vf { position: absolute; width: 22px; height: 22px; border-color: rgba(56,189,248,.85); opacity: 0; animation: lf-vf-in .8s ease-out 1.2s forwards, lf-vf-pulse 3.2s ease-in-out 2s infinite; }
.lf-vf-tl { top: 16px; left: 16px;  border-top: 2px solid; border-left: 2px solid;  border-top-left-radius: 4px; }
.lf-vf-tr { top: 16px; right: 16px; border-top: 2px solid; border-right: 2px solid; border-top-right-radius: 4px; }
.lf-vf-bl { bottom: 16px; left: 16px;  border-bottom: 2px solid; border-left: 2px solid;  border-bottom-left-radius: 4px; }
.lf-vf-br { bottom: 16px; right: 16px; border-bottom: 2px solid; border-right: 2px solid; border-bottom-right-radius: 4px; }
@keyframes lf-vf-in    { from { opacity: 0; transform: scale(1.8); } to { opacity: 1; transform: scale(1); } }
@keyframes lf-vf-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(.82); } }

.lf-rec { width: 8px; height: 8px; border-radius: 9999px; background: #f43f5e; animation: lf-blink 1.4s steps(2, jump-none) infinite; }
@keyframes lf-blink { 50% { opacity: .15; } }

/* ==========================================
   SCROLL REVEAL (cards fade up with blur)
   Staggered with style={{ "--d": "120ms" }}
========================================== */
.lf-reveal {
  opacity: 0;
  transform: translateY(28px) scale(.97);
  filter: blur(6px);
  transition: opacity .8s var(--lf-ease-out-expo), transform .8s var(--lf-ease-out-expo), filter .8s var(--lf-ease-out-expo);
  transition-delay: var(--d, 0ms);
}
.lf-reveal.lf-in { opacity: 1; transform: none; filter: none; }

/* photos: hidden only until the section reveals, so hover still works after */
.lf-reveal:not(.lf-in) .lf-photo { opacity: 0; }
.lf-in .lf-photo { animation: lf-fade-up .8s var(--lf-ease-out-expo) backwards; animation-delay: var(--d, 0ms); }
.lf-photo { transition: transform .35s var(--lf-ease-soft), box-shadow .35s var(--lf-ease-soft), border-color .25s ease; }
.lf-photo:hover { transform: translateY(-6px); box-shadow: 0 16px 34px rgba(2, 6, 23, .4); }

/* review rows slide in from the left, one by one */
.lf-reveal:not(.lf-in) .lf-row { opacity: 0; }
.lf-in .lf-row { animation: lf-row-in .7s var(--lf-ease-out-expo) backwards; animation-delay: var(--d, 0ms); transition: background-color .25s ease; }
.lf-row:hover { background-color: rgba(255, 255, 255, .04); }

/* light sweep on hover */
.lf-sheen { position: relative; overflow: hidden; }
.lf-sheen::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.22) 50%, transparent 65%);
  transform: translateX(-120%); transition: transform .9s ease; }
.lf-sheen:hover::after { transform: translateX(120%); }

/* ==========================================
   STATUS DOT PULSE (section headings)
========================================== */
.lf-dot { position: relative; }
.lf-dot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: inherit; animation: lf-pulse-dot 1.8s infinite; }

/* ==========================================
   BUTTONS
========================================== */
.lf-btn { transition: transform .25s var(--lf-ease-soft), box-shadow .25s var(--lf-ease-soft), background-color .2s ease, border-color .2s ease, color .2s ease; }
.lf-btn:hover:not(:disabled) { transform: translateY(-2px); }
.lf-btn:active:not(:disabled) { transform: scale(.95); }
.lf-star { transition: transform .25s var(--lf-ease-soft); }
.lf-star:hover { transform: scale(1.25) rotate(-8deg); }
.lf-star:active { transform: scale(.9); }

.lf-cta { position: relative; overflow: hidden; }
.lf-cta::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%);
  transform: translateX(-130%); animation: lf-cta-sweep 3.6s ease-in-out infinite; }
@keyframes lf-cta-sweep { 0%, 55% { transform: translateX(-130%); } 100% { transform: translateX(130%); } }

.lf-float { animation: lf-float 4s ease-in-out infinite; }
@keyframes lf-float { 50% { transform: translateY(-8px) rotate(-4deg); } }

.lf-lens { animation: lf-lens 4.5s ease-in-out infinite; }
@keyframes lf-lens {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(56,189,248,0)); transform: scale(1); }
  50%      { filter: drop-shadow(0 0 8px rgba(56,189,248,.9)); transform: scale(1.12) rotate(-6deg); }
}

/* ==========================================
   AVATAR RING
========================================== */
.lf-ring { position: relative; padding: 3px; border-radius: 9999px; flex-shrink: 0; }
.lf-ring::before { content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: conic-gradient(from 0deg, #38bdf8, #a78bfa, #34d399, #38bdf8); animation: lf-spin 6s linear infinite; }
.lf-ring::after { content: ""; position: absolute; inset: -6px; border-radius: inherit; background: inherit;
  box-shadow: 0 0 28px rgba(56,189,248,.35); opacity: .7; animation: lf-glow 3s ease-in-out infinite; pointer-events: none; }
.lf-ring > * { position: relative; z-index: 1; border-radius: 9999px; }
@keyframes lf-spin { to { transform: rotate(360deg); } }
@keyframes lf-glow { 50% { opacity: .2; transform: scale(1.06); } }

/* ==========================================
   SIDEBAR: sliding indicator + tab click
========================================== */
.lf-tab { position: relative; overflow: hidden; transition: transform .15s ease, background-color .25s ease, color .25s ease; }
.lf-tab:active { transform: scale(.96); }
.lf-tab svg { transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
.lf-tab:hover svg { transform: translateX(3px) scale(1.2) rotate(-6deg); }
.lf-tab-on svg { animation: lf-icon-nudge .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes lf-icon-nudge { 0% { transform: translateX(-8px) scale(.8); } 100% { transform: none; } }

.lf-nav-indicator {
  position: absolute; left: 0; top: 0; z-index: 0; pointer-events: none;
  border-left: 4px solid #0ea5e9;
  background: linear-gradient(90deg, rgba(14,165,233,.24), rgba(14,165,233,.06));
  box-shadow: inset 0 0 24px rgba(14,165,233,.12);
  transition: transform .5s cubic-bezier(.65,0,.35,1), width .5s cubic-bezier(.65,0,.35,1), height .5s cubic-bezier(.65,0,.35,1), opacity .3s ease;
  will-change: transform;
}
.lf-nav-indicator.no-anim { transition: none; }

/* the section you jumped to slides in from the right */
.lf-arrive { border-radius: 1rem; animation: lf-slide-in .8s var(--lf-ease-out-expo) both !important; }
@keyframes lf-slide-in {
  0%   { transform: translateX(90px); opacity: 0; filter: blur(4px); }
  60%  { opacity: 1; filter: none; }
  100% { transform: none; opacity: 1; filter: none; }
}

/* ==========================================
   SKELETON LOADER
========================================== */
.lf-skeleton { padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px;
  background: #10192c; border: 1px solid #30425f; border-radius: 12px;
  animation: lf-fade-in .5s var(--lf-ease-soft) backwards; animation-delay: calc(var(--i, 0) * 60ms); }
.lf-skeleton-top { display: flex; align-items: center; gap: 13px; margin-bottom: 6px; }
.lf-skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.lf-skeleton-avatar { width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0; }
.lf-skeleton-line { display: block; height: 12px; border-radius: 6px; }
.lf-skeleton-photo { display: block; aspect-ratio: 4 / 3; border-radius: 10px; }
.w40 { width: 40%; } .w60 { width: 60%; } .w70 { width: 70%; } .w90 { width: 90%; }
.lf-shimmer-bar { background: linear-gradient(90deg, #17243a 0%, #22324d 50%, #17243a 100%); background-size: 800px 100%; animation: lf-shimmer 1.4s linear infinite; }

/* ==========================================
   LIGHTBOX / MODAL
========================================== */
.lf-lightbox { animation: lf-fade-in .3s var(--lf-ease-soft); }
.lf-lightbox-img { animation: lf-modal-pop .45s var(--lf-ease-out-expo) both; }

/* ==========================================
   ACCESSIBILITY: reduced motion
========================================== */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .lf-orb, .lf-kenburns, .lf-shimmer-text, .lf-vf, .lf-rec, .lf-ring::before, .lf-ring::after,
  .lf-cta::after, .lf-float, .lf-lens, .lf-dot::after, .lf-shimmer-bar, .lf-tab-on svg, .lf-arrive,
  .lf-header-in, .lf-rise, .lf-focus-pull, .lf-photo, .lf-row, .lf-lightbox, .lf-lightbox-img { animation: none !important; }
  .lf-reveal, .lf-vf { opacity: 1 !important; transform: none !important; filter: none !important; transition: none !important; }
  .lf-nav-indicator { transition: none; }
}

`;

const PORTFOLIO_BUCKET = "portfolio";

const NAV_ITEMS = [
  { label: "Home", href: "#home", icon: FaHome },
  { label: "Portfolio", href: "#featured-photos", icon: FaRegImage },
  { label: "Schedule", href: "#schedule", icon: FaCalendarAlt },
  { label: "My Bookings", href: "#my-bookings", icon: FaFileAlt },
  { label: "Reviews", href: "#reviews", icon: FaHeart },
];

async function getFeaturedPhotoSignedUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) {
    console.error("Failed to load featured photo:", error.message);
    return null;
  }
  return data.signedUrl;
}
const publicUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
};

/* ============ Small pieces ============ */

function Stars({ value = 0, size = "text-sm" }) {
  const filled = Math.round(Number(value) || 0);
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-400 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        n <= filled ? <FaStar key={n} /> : <FaRegStar key={n} className="text-slate-600" />
      )}
    </span>
  );
}

function Avatar({ path, name, className = "h-20 w-20" }) {
  const url = publicUrl(path);
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return url ? (
    <img src={url} alt={name} className={`${className} rounded-2xl object-cover`} />
  ) : (
    <div
      className={`${className} flex items-center justify-center rounded-2xl bg-sky-500/10 text-xl font-bold text-sky-400`}
    >
      {initials}
    </div>
  );
}

function Section({ title, dot, right, children, id }) {
  return (
    <section
      id={id}
      className="lf-reveal min-w-0 scroll-mt-6 rounded-xl border border-slate-700 bg-[#10192C] p-3 shadow-sm shadow-black/10 sm:p-4"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`lf-dot h-2 w-2 rounded-full ${dot}`} />
          {title}
        </h3>
        {right}
      </header>
      {children}
    </section>
  );
}

/* ============ Skeleton loader ============ */

function PortalSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="lf-skeleton" style={{ "--i": 0 }}>
        <div className="lf-skeleton-top">
          <span className="lf-skeleton-avatar lf-shimmer-bar" />
          <span className="lf-skeleton-lines">
            <span className="lf-skeleton-line lf-shimmer-bar w40" />
            <span className="lf-skeleton-line lf-shimmer-bar w70" />
          </span>
        </div>
        <span className="lf-skeleton-line lf-shimmer-bar w90" />
        <span className="lf-skeleton-line lf-shimmer-bar w60" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="lf-skeleton" style={{ "--i": i }}>
            <span className="lf-skeleton-photo lf-shimmer-bar" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Sign in (clients use their own account) ============ */

function ClientAuth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  }
  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-[#070D1D] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <section className="my-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-black/30 sm:p-7">
      <h2 className="mb-1 text-lg font-semibold text-white sm:text-xl">
        {mode === "signin" ? "Client sign in" : "Create a client account"}
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Sign in, then enter the code your photographer gave you.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {info && <p className="text-xs text-sky-400">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
          setInfo("");
        }}
        className="mt-3 w-full text-center text-xs text-slate-400 hover:text-white"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
      </section>
    </main>
  );
}

/* ============ Enter-a-code card ============ */

function CodeForm({ onConnect, connecting, error, onCancel }) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConnect(code, () => setCode(""));
      }}
      className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-[#10192C] p-4 shadow-xl shadow-black/20 sm:p-6"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <FaKey />
        </span>
        <h3 className="font-semibold text-white">Connect to your photographer</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Enter the unique code your photographer shared with you.
      </p>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. A3F9C21B"
        maxLength={16}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center font-mono text-lg tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={connecting || code.trim().length < 4}
          className="lf-btn rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect"}
        </button>
      </div>
    </form>
  );
}

/* ============ Review form ============ */

function ReviewForm({ existing, onSubmit, saving, error }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [hover, setHover] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) onSubmit(rating, comment);
      }}
      className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 p-3 sm:p-4"
    >
      <p className="mb-2 text-xs font-semibold text-slate-300">
        {existing ? "Update your rating" : "Rate this photographer"}
      </p>
      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="lf-star text-xl text-amber-400"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            {n <= (hover || rating) ? <FaStar /> : <FaRegStar className="text-slate-600" />}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Share your experience (optional)"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!rating || saving}
          className="lf-btn rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : existing ? "Update rating" : "Submit rating"}
        </button>
      </div>
    </form>
  );
}

/* ============ Page ============ */

function ClientPortalPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState(window.location.hash || "#home");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [connLoading, setConnLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [portal, setPortal] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [bookingsKey, setBookingsKey] = useState(0);

  /* ---- animations: scroll reveal ---- */
  useScrollReveal(portal);

  /* ---- animations: sliding tab indicator ---- */
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    ready: false,
    animate: false,
  });

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      if (!nav) return;
      const a = nav.querySelector(`a[href="${activeNav || "#home"}"]`);
      if (!a) return;
      setIndicator((prev) => ({
        x: a.offsetLeft,
        y: a.offsetTop,
        w: a.offsetWidth,
        h: a.offsetHeight,
        ready: true,
        animate: prev.ready, // first placement has no animation
      }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeNav, user, authLoading]);

  /* ---- animations: tab click -> section slides in ---- */
  const handleNavClick = (href) => {
    setActiveNav(href);
    if (href === "#home") return;
    const el = document.querySelector(href);
    if (!el) return;
    el.classList.remove("lf-arrive");
    void el.offsetWidth; // restart the animation if clicked again
    el.classList.add("lf-arrive");
    setTimeout(() => el.classList.remove("lf-arrive"), 1000);
  };

  useEffect(() => {
    const syncHash = () => setActiveNav(window.location.hash || "#home");
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error.message);
      return;
    }
    navigate("/", { replace: true });
  };

  /* ---- auth ---- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---- connections ---- */
  const loadConnections = useCallback(async (preferredId = null) => {
    setConnLoading(true);
    try {
      const { data, error } = await supabase.rpc("my_connections");
      if (error) {
        console.error("Failed to load connections:", error.message);
        setPortalError(error.message);
        return [];
      }
      const rows = Array.isArray(data) ? data : [];
      setConnections(rows);
      const selectedId =
        preferredId && rows.some((row) => row.photographer_id === preferredId)
          ? preferredId
          : rows.some((row) => row.photographer_id === activeId)
          ? activeId
          : rows[0]?.photographer_id || null;
      setActiveId(selectedId);
      if (rows.length > 0) setShowCodeForm(false);
      return rows;
    } catch (err) {
      console.error("Unexpected connection loading error:", err);
      setPortalError(err.message || "Could not load your photographer connections.");
      return [];
    } finally {
      setConnLoading(false);
    }
  }, [activeId]);
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadConnections();
    } else {
      setConnections([]);
      setActiveId(null);
      setPortal(null);
      setPortalError("");
      setCodeError("");
      setShowCodeForm(false);
    }
  }, [user, authLoading, loadConnections]);

  /* ---- the active photographer's portal ---- */
  const loadPortal = useCallback(async (photographerId) => {
    if (!photographerId || typeof photographerId !== "string") {
      setPortal(null);
      setPortalError("No photographer selected. Please reconnect using the photographer code.");
      return;
    }
    setPortalLoading(true);
    setPortalError("");
    try {
      const { data, error } = await supabase.rpc("get_portal", {
        p_photographer_id: photographerId,
      });
      if (error) throw error;
      if (!data) throw new Error("The photographer portal returned no data.");
      const featuredPhotos = await Promise.all(
        (data?.featured_photos || []).map(async (photo) => ({
          ...photo,
          photo_url: await getFeaturedPhotoSignedUrl(photo.storage_path),
        }))
      );
      setPortal({
        ...data,
        featured_photos: featuredPhotos,
      });
    } catch (err) {
      console.error("Failed to load portal:", err.message || err);
      setPortalError(err.message || "Failed to load photographer portal.");
      setPortal(null);
    } finally {
      setPortalLoading(false);
    }
  }, []);
  useEffect(() => {
    setLightboxIndex(null);
    setBookingDate(null);
    if (activeId) loadPortal(activeId);
    else setPortal(null);
  }, [activeId, loadPortal]);

  /* ---- connect with a code ---- */
  const handleConnect = async (code, reset) => {
    setConnecting(true);
    setCodeError("");
    setPortalError("");
    try {
      const { data, error } = await supabase.rpc("connect_with_code", {
        p_code: code.trim().toUpperCase(),
      });
      if (error) throw error;

      // connect_with_code returns an object such as
      // { success: true, photographer_id: "..." }, not a UUID directly.
      const photographerId = data?.photographer_id;
      if (!photographerId || typeof photographerId !== "string") {
        throw new Error("The connection response did not include a valid photographer ID.");
      }
      const rows = await loadConnections(photographerId);
      const connected = rows.some((row) => row.photographer_id === photographerId);
      if (!connected) {
        throw new Error("The code was accepted, but the saved connection could not be found. Refresh and try again.");
      }
      reset?.();
      setShowCodeForm(false);
      setActiveId(photographerId);
      await loadPortal(photographerId);
    } catch (err) {
      console.error("Failed to connect to photographer:", err);
      setCodeError(err.message || "Could not connect to the photographer.");
    } finally {
      setConnecting(false);
    }
  };

  /* ---- rating ---- */
  const handleReview = async (rating, comment) => {
    setReviewSaving(true);
    setReviewError("");
    const { error } = await supabase.rpc("submit_review", {
      p_photographer_id: activeId,
      p_rating: rating,
      p_comment: comment,
    });
    setReviewSaving(false);
    if (error) {
      setReviewError(error.message);
      return;
    }
    await loadPortal(activeId);
  };

  /* ---- shape the data for the existing Calendar component ---- */
  const calendarEvents = useMemo(
    () =>
      (portal?.events || []).map((row) => {
        const start = new Date(row.start_time);
        const end = new Date(row.end_time);
        return {
          id: row.id,
          title: "Booked",
          client: "",
          photographer: "",
          category: row.category,
          location: "",
          gears: [],
          notes: "",
          start,
          end,
          date: start.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }),
    [portal]
  );

  // get_portal currently returns the photographer fields at the top level
  // (username, bio, avatar_path, featured_photos), rather than nested under
  // portal.profile / portal.featured. Support both shapes during transition.
  const profile = portal?.profile || portal?.photographer || portal || null;
  const rawFeatured = portal?.featured || portal?.featured_photos || [];
  const featured = Array.isArray(rawFeatured)
    ? rawFeatured.map((photo, index) => ({
        ...photo,
        id: photo.id ?? photo.photo_id ?? `${index}-${photo.storage_path || photo.image_path || photo.photo_url || "photo"}`,
        image_path:
          photo.photo_url || photo.image_path || photo.storage_path || photo.photo_path || null,
        caption: photo.caption || photo.title || photo.photo_name || "",
      })).filter((photo) => Boolean(photo.image_path))
    : [];
  const reviews = Array.isArray(portal?.reviews) ? portal.reviews : [];
  const myReview = reviews.find((r) => r.mine) || null;

  /* ---- lightbox keys ---- */
  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKey(e) {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i + 1) % featured.length);
      else if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i - 1 + featured.length) % featured.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, featured.length]);

  /* ---- calendar date click -> open the booking form ---- */
  const handleSelectSlot = ({ start }) => {
    const d = new Date(start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const todayKey = new Date().toLocaleDateString("en-CA");
    if (key >= todayKey) setBookingDate(key);
  };

  /* ============ RENDER ============ */
  if (authLoading) {
    return <div className="min-h-[50vh] px-4 py-16 text-center text-sm text-slate-500">Loading...</div>;
  }
  if (!user) {
    return <ClientAuth />;
  }
  const noConnections = !connLoading && connections.length === 0;
  return (
    <div className="custom-scrollbar relative isolate min-h-screen w-full overflow-x-hidden bg-[#070D1D] text-slate-100">
      <style>{PORTAL_CSS}</style>
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <span className="lf-orb lf-orb-1" />
        <span className="lf-orb lf-orb-2" />
        <span className="lf-orb lf-orb-3" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px]">
      <div className="min-h-screen lg:flex">
        <aside className="border-b border-slate-800 bg-[#0B1120] lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:border-slate-800 lg:bg-slate-900/90 lg:backdrop-blur-lg">
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-6">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <FaCameraRetro className="lf-lens text-sky-500" />
            </h1>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">LensFlow</h1>
              <p className="text-xs text-slate-400">Client Portal</p>
            </div>
          </div>

          {/* NAV with sliding indicator */}
          <nav
            ref={navRef}
            className="relative flex gap-1 overflow-x-auto py-4 lg:flex-col lg:gap-2"
            aria-label="Client portal navigation"
          >
            <span
              aria-hidden="true"
              className={`lf-nav-indicator ${indicator.animate ? "" : "no-anim"}`}
              style={{
                width: indicator.w,
                height: indicator.h,
                opacity: indicator.ready ? 1 : 0,
                transform: `translate(${indicator.x}px, ${indicator.y}px)`,
              }}
            />
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const on =
                activeNav === item.href || (item.href === "#home" && activeNav === "");
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`lf-tab relative z-10 flex shrink-0 items-center gap-3 border-l-4 border-transparent px-4 py-3 text-sm font-medium ${
                    on
                      ? "lf-tab-on text-sky-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className="text-base" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-t border-slate-800 lg:block">
            <a href="#photographer"
              className="flex items-center gap-3 border-l-4 border-transparent px-6 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white">
              <FaUser /> Photographer
            </a>
            <button type="button" onClick={handleSignOut}
              className="flex w-full items-center gap-3 border-l-4 border-transparent px-6 py-3 text-left text-sm text-rose-400 transition hover:bg-slate-800 hover:text-rose-300">
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1 lg:ml-[248px]">
          <header className="lf-header-in flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0B1120]/95 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-400">LensFlow / Client Space</p>
              <p className="mt-1 text-sm text-slate-300">Your photographer, your moments.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {connections.length > 1 && connections.map((c) => (
                <button key={c.photographer_id} type="button" onClick={() => setActiveId(c.photographer_id)}
                  className={`lf-btn max-w-[180px] truncate rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    activeId === c.photographer_id
                      ? "border-sky-400 bg-sky-500/10 text-sky-300"
                      : "border-slate-700 bg-[#10192C] text-slate-400 hover:border-slate-600 hover:text-white"
                  }`}>
                  {c.display_name}
                </button>
              ))}
              {!noConnections && (
                <button type="button" onClick={() => { setCodeError(""); setShowCodeForm(true); }}
                  className="lf-cta flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400">
                  <FaKey /> Enter Connection Code
                </button>
              )}
              <button type="button" onClick={handleSignOut}
                className="lf-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden">
                <FaSignOutAlt /> Sign out
              </button>
            </div>
          </header>
      <main id="home" className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1500px]">
          {/* HERO with Ken Burns, viewfinder and focus-pull */}
          <section className="relative mb-4 min-h-[220px] overflow-hidden rounded-2xl border border-slate-700 bg-[#10192C] sm:min-h-[260px]">
            <div className="lf-kenburns absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "linear-gradient(90deg, rgba(5,12,24,.94) 0%, rgba(5,12,24,.72) 46%, rgba(5,12,24,.10) 100%), url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=85')" }}
              aria-hidden="true" />
            <span className="lf-vf lf-vf-tl" />
            <span className="lf-vf lf-vf-tr" />
            <span className="lf-vf lf-vf-bl" />
            <span className="lf-vf lf-vf-br" />
            <span className="absolute right-10 top-5 flex items-center gap-2 text-[10px] font-semibold tracking-widest text-slate-300">
              <span className="lf-rec" /> LIVE
            </span>
            <div className="relative flex min-h-[220px] max-w-3xl flex-col justify-center px-6 py-8 sm:min-h-[260px] sm:px-10">
              <p className="lf-rise mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300 sm:text-xs"
                style={{ "--d": "100ms" }}>
                <span className="h-0.5 w-8 bg-sky-400" /> Welcome to LensFlow
              </p>
              <h2 className="lf-focus-pull max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Capturing<br />Your <span className="lf-shimmer-text">Special Moments</span>
              </h2>
              <p className="lf-rise mt-4 text-sm text-slate-200 sm:text-base" style={{ "--d": "700ms" }}>
                Authentic photos for real stories.
              </p>
            </div>
          </section>
      {connLoading && connections.length === 0 ? (
        <PortalSkeleton />
      ) : noConnections || showCodeForm ? (
        <div className="py-3 sm:py-6">
          <CodeForm
            onConnect={handleConnect}
            connecting={connecting}
            error={codeError}
            onCancel={showCodeForm && !noConnections ? () => setShowCodeForm(false) : null}
          />
        </div>
      ) : portalLoading && !portal ? (
        <PortalSkeleton />
      ) : portalError ? (
        <p className="rounded-xl border border-dashed border-rose-500/40 py-10 text-center text-sm text-rose-300">
          {portalError}
        </p>
      ) : portal && profile ? (
          <div className="min-w-0 space-y-4 sm:space-y-5">
            {/* Profile + rating */}
            <section id="photographer" className="lf-reveal min-w-0 scroll-mt-6 rounded-2xl border border-slate-700/80 bg-gradient-to-r from-[#102338] to-[#0B1628] p-4 shadow-sm shadow-black/10 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="lf-ring h-[88px] w-[88px]">
                  <Avatar
                    path={profile.avatar_path}
                    name={profile.display_name || profile.username || profile.name || "Photographer"}
                    className="h-full w-full rounded-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h3 className="text-xl font-bold text-white">{profile.display_name || profile.username || profile.name || "Photographer"}</h3>
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
            <div className="grid min-w-0 gap-4 xl:grid-cols-[1.35fr_1fr]">
            {/* Featured photos */}
            <Section
              id="featured-photos"
              title="Featured Works"
              dot="bg-amber-400"
              right={
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
                  {featured.length}
                </span>
              }
            >
              {featured.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
                  <FaRegImages className="text-2xl text-slate-600" />
                  No featured photos yet.
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {featured.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      style={{ "--d": `${index * 80}ms` }}
                      className="lf-photo lf-sheen group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:-translate-y-0.5 hover:border-sky-400"
                    >
                      <img
                        src={publicUrl(photo.image_path)}
                        alt={photo.caption || "Featured photo"}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      {photo.caption && (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-left text-[11px] text-white">
                          {photo.caption}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Home booking shortcut */}
            <section className="lf-reveal group flex min-h-[190px] items-center justify-between gap-4 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#10263D] via-[#0D1D30] to-[#0B1628] p-5 transition duration-300 hover:border-sky-400/40 sm:p-6">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-1 w-7 rounded-full bg-sky-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Plan your next session
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white">
                  Book a Schedule
                </h3>

                <p className="mt-2 max-w-[230px] text-sm leading-relaxed text-slate-400">
                  Check availability and plan your session.
                </p>

                <a
                  href="#schedule"
                  onClick={() => handleNavClick("#schedule")}
                  className="lf-cta mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#0B1628]"
                >
                  View Calendar
                  <FaChevronRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              <div className="lf-float flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-sky-400/15 bg-sky-400/10 text-3xl text-sky-400 transition group-hover:bg-sky-400/15 sm:h-24 sm:w-24">
                <FaCalendarAlt />
              </div>
            </section>

            </div>
            {/* About photographer */}
            <Section title="About the Photographer" dot="bg-sky-400">
              <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                    {profile.bio || profile.tagline || "Discover the photographer's style, specialties, and approach to capturing your moments."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(profile.specialties?.length ? profile.specialties.slice(0, 4) : ["Events", "Portraits", "Weddings", "Lifestyle"]).map((specialty, index) => {
                    const icons = [FaCalendarAlt, FaUser, FaHeart, FaCameraRetro];
                    const Icon = icons[index % icons.length];
                    return (
                      <div key={specialty} className="flex flex-col items-center rounded-xl border border-slate-800 bg-[#0B1628] px-2 py-3 text-center">
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
            {/* Full photographer schedule */}
            <section id="schedule" className="lf-reveal scroll-mt-6">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Availability</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Schedule</h2>
                <p className="mt-2 text-sm text-slate-400">
                  View the photographer's availability. Select an available date to start a booking request. Other clients' event details remain private.
                </p>
              </div>
              <Section id="availability" title="Photographer Calendar" dot="bg-sky-400">
                <div className="min-w-0 max-w-full overflow-x-auto rounded-lg">
                  <Calendar
                    events={calendarEvents}
                    onSelectSlot={handleSelectSlot}
                    onEventClick={() => {}}
                  />
                </div>
              </Section>
            </section>
            {/* My bookings */}
            <Section id="my-bookings" title="My Bookings" dot="bg-violet-400">
              <MyBookings
                photographerId={activeId}
                refreshKey={bookingsKey}
                onChanged={() => loadPortal(activeId)}
              />
            </Section>
            {/* Ratings */}
            <Section
              id="reviews"
              title="Ratings & Reviews"
              dot="bg-emerald-400"
              right={
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
                  {portal.rating_count}
                </span>
              }
            >
              <div className="space-y-3">
                <ReviewForm
                  key={`${activeId}-${myReview?.id || "new"}`}
                  existing={myReview}
                  onSubmit={handleReview}
                  saving={reviewSaving}
                  error={reviewError}
                />
                {reviews.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map((review, i) => (
                    <article
                      key={review.id}
                      style={{ "--d": `${i * 70}ms` }}
                      className="lf-row rounded-lg border border-slate-700 bg-slate-950/40 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Stars value={review.rating} size="text-xs" />
                          {review.mine && (
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(review.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                          {review.comment}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </Section>
          </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-200">Photographer portal is empty</p>
          <p className="mt-1 text-xs text-slate-500">The connection is active, but the portal did not return a profile to display.</p>
        </div>
      )}
          </div>
        </main>
      {/* Booking popup */}
      <BookingModal
        open={!!bookingDate}
        date={bookingDate}
        photographerId={activeId}
        events={calendarEvents}
        onClose={() => setBookingDate(null)}
        onChanged={() => setBookingsKey((k) => k + 1)}
      />
      {/* Lightbox */}
      {lightboxIndex !== null && featured[lightboxIndex] && (
        <div
          className="lf-lightbox fixed inset-0 z-50 flex flex-col overflow-hidden bg-black/95 px-1 backdrop-blur-sm sm:px-2"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="flex items-center justify-between px-4 py-4 text-white sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <FaCameraRetro className="text-sky-500" />
              {lightboxIndex + 1} / {featured.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="text-slate-400 transition-colors hover:text-white"
              aria-label="Close"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {featured.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((i) => (i - 1 + featured.length) % featured.length)
                }
                className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white sm:left-6"
                aria-label="Previous photo"
              >
                <FaChevronLeft />
              </button>
            )}
            <img
              key={lightboxIndex}
              src={publicUrl(featured[lightboxIndex].image_path)}
              alt={featured[lightboxIndex].caption || "Featured photo"}
              className="lf-lightbox-img max-h-[72vh] max-h-[min(78vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
            />
            {featured.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((i) => (i + 1) % featured.length)}
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white sm:right-6"
                aria-label="Next photo"
              >
                <FaChevronRight />
              </button>
            )}
          </div>
          <p className="py-5 text-center text-sm text-slate-300">
            {featured[lightboxIndex].caption || ""}
          </p>
        </div>
      )}
      </div>
      </div>
    </div>
    </div>
  );
}

export default ClientPortalPage;