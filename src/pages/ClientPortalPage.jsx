import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
import HeroBackground from "../landingPage/HeroBackground";


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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ==========================================
   Same design system as the landing page:
   deep navy background, dark bordered cards, sky-blue accent.
   Every class is prefixed lf- so nothing collides.
========================================== */
.lf{--bg:#020617;--bar:#0a1122;--card:#0a1020;--line:#17213a;--muted:#8a94ab;--accent:#0ea5e9;
  --ease:cubic-bezier(.22,1,.36,1);
  font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:#fff}
.lf-card{background:var(--card);border:1px solid var(--line);border-radius:14px;transition:border-color .3s ease}
.lf-dashed{border:1px dashed #243049;border-radius:12px}
.lf-muted{color:var(--muted)}

/* Buttons */
.lf-btn{background:var(--accent);color:#fff;font-weight:600;border-radius:8px;
  transition:background-color .2s ease,transform .2s var(--ease),box-shadow .2s ease}
.lf-btn:hover{background:#38bdf8;transform:translateY(-1px);box-shadow:0 8px 20px -8px rgba(14,165,233,.6)}
.lf-btn:active{transform:scale(.97)}
.lf-btn:disabled{opacity:.5;cursor:not-allowed}
.lf-btn:disabled:hover{background:var(--accent);transform:none;box-shadow:none}
.lf-ghost{border:1px solid var(--line);border-radius:8px;font-weight:500;transition:background-color .2s ease,transform .2s var(--ease)}
.lf-ghost:hover{background:var(--card)}
.lf-ghost:active{transform:scale(.97)}

/* Inputs */
.lf-input{background:#070d1c;border:1px solid var(--line);border-radius:8px;color:#fff;
  transition:border-color .2s ease,box-shadow .2s ease}
.lf-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(14,165,233,.18)}

.lf a:focus-visible,.lf button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* Hover lift for cards and tiles */
.lf-lift{transition:transform .3s var(--ease),border-color .3s ease,box-shadow .3s ease}
.lf-lift:hover{transform:translateY(-4px);border-color:rgba(14,165,233,.5);box-shadow:0 14px 32px -14px rgba(14,165,233,.3)}
.lf-chip{transition:border-color .25s ease,background-color .25s ease,transform .25s var(--ease)}
.lf-chip:hover{border-color:rgba(14,165,233,.6);background:rgba(14,165,233,.08);transform:translateY(-2px)}

/* Hero background (used by HeroBackground): camera drift on the photo, floating glows */
@keyframes lfFade{from{opacity:0}to{opacity:1}}
@keyframes lfDrift{
  from{transform:scale(1.12) translate3d(-2.5%,-1.5%,0)}
  to{transform:scale(1.26) translate3d(2.5%,1.5%,0)}}
.lf-hero-img{animation:lfFade 1.4s ease both,lfDrift 22s ease-in-out 1.4s infinite alternate;will-change:transform}
.lf-orb{position:absolute;border-radius:9999px;filter:blur(70px);mix-blend-mode:screen;opacity:.55}
.lf-orb-a{width:26rem;height:26rem;left:-6rem;top:-4rem;background:rgba(14,165,233,.5);animation:lfOrbA 16s ease-in-out infinite alternate}
.lf-orb-b{width:30rem;height:30rem;right:-8rem;top:10%;background:rgba(99,102,241,.45);animation:lfOrbB 20s ease-in-out infinite alternate}
.lf-orb-c{width:20rem;height:20rem;left:35%;bottom:-6rem;background:rgba(56,189,248,.35);animation:lfOrbC 18s ease-in-out infinite alternate}
@keyframes lfOrbA{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(22vw,12vh,0) scale(1.4)}}
@keyframes lfOrbB{from{transform:translate3d(0,0,0) scale(1.2)}to{transform:translate3d(-24vw,16vh,0) scale(.85)}}
@keyframes lfOrbC{from{transform:translate3d(0,0,0) scale(.9)}to{transform:translate3d(-20vw,-14vh,0) scale(1.35)}}

/* Sticky header */
.lf-header{position:sticky;top:0;z-index:50;background:rgba(10,17,34,.85);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
html{scroll-padding-top:5rem}

/* Scroll reveal */
.lf-reveal{opacity:0;transform:translateY(28px);
  transition:opacity .8s var(--ease),transform .8s var(--ease);transition-delay:var(--d,0ms)}
.lf-reveal.lf-in{opacity:1;transform:none}

/* Page-load entrance */
@keyframes lfRise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes lfDrop{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
.lf-rise{opacity:0;animation:lfRise .9s var(--ease) forwards}
.lf-drop{opacity:0;animation:lfDrop .7s var(--ease) forwards}

/* Photos rise in one by one after their section reveals, then lift on hover */
.lf-reveal:not(.lf-in) .lf-photo{opacity:0}
.lf-in .lf-photo{animation:lfRise .8s var(--ease) backwards;animation-delay:var(--d,0ms)}
.lf-photo{transition:transform .3s var(--ease),border-color .3s ease,box-shadow .3s ease}
.lf-photo:hover{transform:translateY(-4px);border-color:rgba(14,165,233,.5);box-shadow:0 14px 32px -14px rgba(14,165,233,.3)}

/* Review rows slide in one by one */
@keyframes lfRowIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}
.lf-reveal:not(.lf-in) .lf-row{opacity:0}
.lf-in .lf-row{animation:lfRowIn .7s var(--ease) backwards;animation-delay:var(--d,0ms);transition:background-color .25s ease}
.lf-row:hover{background-color:rgba(255,255,255,.03)}

/* Rating stars */
.lf-star{transition:transform .25s var(--ease)}
.lf-star:hover{transform:scale(1.2)}
.lf-star:active{transform:scale(.9)}

/* Avatar ring */
.lf-ring{padding:3px;border-radius:9999px;flex-shrink:0;background:linear-gradient(135deg,#38bdf8,#6366f1)}
.lf-ring > *{border-radius:9999px}

/* Sidebar tabs and the sliding indicator */
.lf-tab{position:relative;overflow:hidden;transition:transform .15s ease,background-color .25s ease,color .25s ease}
.lf-tab:active{transform:scale(.97)}
.lf-tab svg{transition:transform .3s var(--ease)}
.lf-tab:hover svg{transform:translateX(3px)}
.lf-nav-indicator{
  position:absolute;left:0;top:0;z-index:0;pointer-events:none;
  border-left:4px solid var(--accent);
  background:linear-gradient(90deg,rgba(14,165,233,.22),rgba(14,165,233,.05));
  transition:transform .5s cubic-bezier(.65,0,.35,1),width .5s cubic-bezier(.65,0,.35,1),height .5s cubic-bezier(.65,0,.35,1),opacity .3s ease;
  will-change:transform}
.lf-nav-indicator.no-anim{transition:none}

/* The section you jumped to slides in from the right */
@keyframes lfArrive{
  0%{transform:translateX(70px);opacity:0}
  100%{transform:none;opacity:1}}
.lf-arrive{border-radius:1rem;animation:lfArrive .8s var(--ease) both !important}

/* Skeleton loader */
@keyframes lfShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.lf-skeleton{padding:20px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;
  background:var(--card);border:1px solid var(--line);border-radius:14px;
  animation:lfFade .5s var(--ease) backwards;animation-delay:calc(var(--i,0) * 60ms)}
.lf-skeleton-top{display:flex;align-items:center;gap:13px;margin-bottom:6px}
.lf-skeleton-lines{flex:1;display:flex;flex-direction:column;gap:8px}
.lf-skeleton-avatar{width:64px;height:64px;border-radius:50%;flex-shrink:0}
.lf-skeleton-line{display:block;height:12px;border-radius:6px}
.lf-skeleton-photo{display:block;aspect-ratio:4 / 3;border-radius:10px}
.w40{width:40%}.w60{width:60%}.w70{width:70%}.w90{width:90%}
.lf-shimmer-bar{background:linear-gradient(90deg,#0f182c 0%,#1a2742 50%,#0f182c 100%);background-size:800px 100%;animation:lfShimmer 1.4s linear infinite}

/* Lightbox */
@keyframes lfPop{from{opacity:0;transform:scale(.95) translateY(20px)}to{opacity:1;transform:none}}
.lf-lightbox{animation:lfFade .3s ease}
.lf-lightbox-img{animation:lfPop .45s var(--ease) both}

@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media (prefers-reduced-motion:reduce){
  .lf-reveal,.lf-rise,.lf-drop{opacity:1;transform:none;animation:none;transition:none}
  .lf-btn,.lf-ghost,.lf-lift,.lf-chip,.lf-card,.lf-photo,.lf-star,.lf-tab{transition:none}
  .lf-btn:hover,.lf-lift:hover,.lf-chip:hover,.lf-photo:hover,.lf-star:hover,.lf-tab:hover svg{transform:none}
  .lf-hero-img{animation:none}
  .lf-orb{display:none}
  .lf-photo,.lf-row,.lf-shimmer-bar,.lf-arrive,.lf-lightbox,.lf-lightbox-img,.lf-skeleton{animation:none !important}
  .lf-reveal:not(.lf-in) .lf-photo,.lf-reveal:not(.lf-in) .lf-row{opacity:1}
  .lf-nav-indicator{transition:none}
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
    <section id={id} className="lf-reveal lf-card min-w-0 p-3 sm:p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
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

/* ============ Enter-a-code card ============ */

function CodeForm({ onConnect, connecting, error, onCancel }) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConnect(code, () => setCode(""));
      }}
      className="lf-card mx-auto w-full max-w-md p-4 sm:p-6"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <FaKey />
        </span>
        <h3 className="font-semibold text-white">Connect to your photographer</h3>
      </div>
      <p className="mb-4 text-xs lf-muted">
        Enter the unique code your photographer shared with you.
      </p>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. A3F9C21B"
        maxLength={16}
        className="lf-input w-full px-3 py-3 text-center font-mono text-lg tracking-[0.25em] placeholder:tracking-normal placeholder:text-slate-600"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="lf-ghost px-4 py-2 text-sm text-slate-300"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={connecting || code.trim().length < 4}
          className="lf-btn px-4 py-2 text-sm"
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
      className="min-w-0 rounded-lg border border-[#17213a] bg-[#070d1c] p-3 sm:p-4"
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
        className="lf-input w-full px-3 py-2 text-sm placeholder:text-slate-500"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!rating || saving}
          className="lf-btn px-3 py-1.5 text-xs"
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
  const spyLockRef = useRef(0); // pauses scroll-spy while a tab click is scrolling
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
      if (nav.scrollWidth > nav.clientWidth + 4) {
        nav.scrollTo({ left: Math.max(0, a.offsetLeft - 16), behavior: "smooth" });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeNav, user, authLoading]);

  /* ---- animations: tab click -> section slides in ---- */
  const handleNavClick = (href) => {
    spyLockRef.current = Date.now() + 1000;
    setActiveNav(href);
    if (href === "#home") return;
    const el = document.querySelector(href);
    if (!el) return;
    el.classList.remove("lf-arrive");
    void el.offsetWidth; // restart the animation if clicked again
    el.classList.add("lf-arrive");
    setTimeout(() => el.classList.remove("lf-arrive"), 1000);
  };

  /* ---- scroll-spy: the sidebar highlight follows the section you are viewing ---- */
  useEffect(() => {
    const ids = NAV_ITEMS.map((item) => item.href.slice(1));
    let ticking = false;

    const update = () => {
      ticking = false;
      if (Date.now() < spyLockRef.current) return; // a tab click is scrolling
      const line = window.innerHeight * 0.35; // the "reading line"
      let current = "home";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // at the very bottom of the page, select the last tab
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 8;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (scrollable && atBottom && document.getElementById("reviews")) current = "reviews";

      setActiveNav((prev) => (prev === `#${current}` ? prev : `#${current}`));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [portal]);

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
    // Same login page as the photographer side
    navigate("/login", { replace: true });
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
    return (
      <div className="lf lf-muted grid min-h-screen place-items-center px-4 text-sm">
        <style>{PORTAL_CSS}</style>
        Loading...
      </div>
    );
  }
  if (!user) {
    // Clients use the same login page as photographers
    return <Navigate to="/login" replace />;
  }
  const noConnections = !connLoading && connections.length === 0;
  return (
    <div className="lf custom-scrollbar relative isolate min-h-screen w-full overflow-x-hidden">
      <style>{PORTAL_CSS}</style>
      <div className="relative z-10 mx-auto w-full max-w-[1600px]">
      <div className="min-h-screen lg:flex">
        <aside className="border-b border-[#17213a] bg-[#0a1122] lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:border-[#17213a] lg:bg-[#0a1122]/95 lg:backdrop-blur-lg">
          <div className="border-b border-[#17213a] px-5 py-5">
            <div className="leading-tight">
              <span className="block text-xl font-bold">
                <span className="mr-2 text-sky-500">◉</span>LensFlow
              </span>
              <span className="lf-muted block text-[11px]">Client Portal</span>
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
                      : "lf-muted hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon className="text-base" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-t border-[#17213a] lg:block">
            <a href="#photographer"
              className="flex items-center gap-3 border-l-4 border-transparent px-6 py-3 text-sm lf-muted transition hover:bg-slate-800 hover:text-white">
              <FaUser /> Photographer
            </a>
            <button type="button" onClick={handleSignOut}
              className="flex w-full items-center gap-3 border-l-4 border-transparent px-6 py-3 text-left text-sm text-rose-400 transition hover:bg-slate-800 hover:text-rose-300">
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1 lg:ml-[248px]">
          <header className="lf-header lf-drop flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 lg:px-8" style={{ borderColor: "var(--line)" }}>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-400">LensFlow / Client Space</p>
              <p className="mt-1 text-sm text-slate-300">Your photographer, your moments.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {connections.length > 1 && connections.map((c) => (
                <button key={c.photographer_id} type="button" onClick={() => setActiveId(c.photographer_id)}
                  className={`lf-chip max-w-[180px] truncate rounded-lg border px-3 py-2 text-xs font-medium ${
                    activeId === c.photographer_id
                      ? "border-sky-400 bg-sky-500/10 text-sky-300"
                      : "border-[#17213a] bg-[#0a1020] lf-muted hover:text-white"
                  }`}>
                  {c.display_name}
                </button>
              ))}
              {!noConnections && (
                <button type="button" onClick={() => { setCodeError(""); setShowCodeForm(true); }}
                  className="lf-btn flex items-center gap-2 px-4 py-2.5 text-xs">
                  <FaKey /> Enter Connection Code
                </button>
              )}
              <button type="button" onClick={handleSignOut}
                className="lf-ghost flex items-center gap-2 px-3 py-2 text-xs lf-muted hover:text-white lg:hidden">
                <FaSignOutAlt /> Sign out
              </button>
            </div>
          </header>
      <main id="home" className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1500px]">
          {/* HERO: same moving background as the landing page */}
          <section className="lf-card relative mb-4 overflow-hidden">
            <HeroBackground />
            <div className="relative max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
              <p
                className="lf-rise mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300 sm:text-xs"
                style={{ animationDelay: "100ms" }}
              >
                <span className="h-0.5 w-8 bg-sky-400" /> Welcome to LensFlow
              </p>
              <h2
                className="lf-rise max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl"
                style={{ animationDelay: "220ms" }}
              >
                Capturing Your Special Moments
              </h2>
              <p
                className="lf-rise mt-4 text-sm text-slate-300 sm:text-base"
                style={{ animationDelay: "350ms" }}
              >
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
            <section id="photographer" className="lf-reveal lf-card min-w-0 p-4 sm:p-5">
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
                        <span className="text-xs lf-muted">
                          ({portal.rating_count} review{portal.rating_count !== 1 ? "s" : ""})
                        </span>
                      )}
                    </span>
                  </div>
                  {(profile.tagline || profile.bio_title) && (
                    <p className="mt-1 text-sm text-sky-300">{profile.tagline || profile.bio_title}</p>
                  )}
                  {profile.location && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs lf-muted">
                      <FaMapMarkerAlt className="lf-muted" /> {profile.location}
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
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[#17213a] py-10 text-center text-sm lf-muted">
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
                      className="lf-photo group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#17213a] bg-slate-800"
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
            <div className="lf-reveal min-w-0">
            <section className="lf-card lf-lift group flex h-full min-h-[190px] items-center justify-between gap-4 overflow-hidden p-5 sm:p-6">
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

                <p className="mt-2 max-w-[230px] text-sm leading-relaxed lf-muted">
                  Check availability and plan your session.
                </p>

                <a
                  href="#schedule"
                  onClick={() => handleNavClick("#schedule")}
                  className="lf-btn mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-xs"
                >
                  View Calendar
                  <FaChevronRight className="text-[10px] transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-sky-400/15 bg-sky-400/10 text-3xl text-sky-400 transition group-hover:bg-sky-400/15 sm:h-24 sm:w-24">
                <FaCalendarAlt />
              </div>
            </section>
            </div>

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
                      <div key={specialty} className="lf-lift flex flex-col items-center rounded-xl border border-[#17213a] bg-[#070d1c] px-2 py-3 text-center">
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
            <section id="schedule" className="lf-reveal">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Availability</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Schedule</h2>
                <p className="mt-2 text-sm lf-muted">
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
                  <p className="rounded-lg border border-dashed border-[#17213a] py-6 text-center text-sm lf-muted">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map((review, i) => (
                    <article
                      key={review.id}
                      style={{ "--d": `${i * 70}ms` }}
                      className="lf-row rounded-lg border border-[#17213a] bg-[#070d1c] p-3"
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
                        <span className="text-[11px] lf-muted">
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
        <div className="rounded-xl border border-dashed border-[#17213a] px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-200">Photographer portal is empty</p>
          <p className="mt-1 text-xs lf-muted">The connection is active, but the portal did not return a profile to display.</p>
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
              className="lf-muted transition-colors hover:text-white"
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