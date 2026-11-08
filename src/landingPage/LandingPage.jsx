import { useEffect, useRef, useState } from "react";
import NavBar from "./NavBar";
import LoginButton from "./LoginButton";
import HeroBackground from "./HeroBackground";

// Matches the LensFlow app UI: deep navy background, dark bordered cards,
// sky-blue accent, dot-marked card titles and dashed empty states.
// Animations: page-load entrance, scroll reveals, hover lifts, count-up numbers,
// and a sliding card in the workflow demo. All of them switch off for people who
// have "reduce motion" enabled on their device.
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.lf{
  --bg:#f5f8fc;
  --bar:#ffffff;
  --card:#ffffff;
  --line:#dce5ee;
  --dashed:#bacbdd;
  --muted:#64748b;
  --text:#0f172a;
  --header-bg:rgba(255,255,255,.90);
  --ghost-text:#475569;
  --ghost-hover:#edf6fc;
  --ghost-hover-text:#0369a1;
  --demo-bg:#f1f5f9;
  --demo-badge:#e2e8f0;
  --demo-badge-text:#334155;
  --demo-title:#0f172a;
  --demo-subtitle:#64748b;
  --accent:#0ea5e9;
  --ease:cubic-bezier(.22,1,.36,1);
  font-family:'Inter',system-ui,sans-serif;
  background:var(--bg);
  color:var(--text);
  transition:background-color 300ms ease,color 300ms ease;
}
html.dark .lf{
  --bg:#020617;
  --bar:#0a1122;
  --card:#0a1020;
  --line:#17213a;
  --dashed:#243049;
  --muted:#8a94ab;
  --text:#ffffff;
  --header-bg:rgba(10,17,34,.85);
  --ghost-text:#cbd5e1;
  --ghost-hover:#0a1020;
  --ghost-hover-text:#ffffff;
  --demo-bg:#070d1c;
  --demo-badge:#1e293b;
  --demo-badge-text:#cbd5e1;
  --demo-title:#ffffff;
  --demo-subtitle:#8a94ab;
}
.lf-card{background:var(--card);border:1px solid var(--line);border-radius:14px;transition:background-color .3s ease,border-color .3s ease}
.lf-dashed{border:1px dashed var(--dashed);border-radius:12px}
.lf-muted{color:var(--muted)}
/* Hero: light-mode sky gradient, original photographic hero in dark mode.
   The HeroBackground component draws dark imagery/glows. An opaque light
   overlay sits ABOVE those decorations only in light mode. */
.lf-hero{background:#f3f9ff;color:#0f172a;transition:background-color .3s ease,color .3s ease}
html.dark .lf-hero{background:#071427;color:#ffffff}
.lf-hero-lightwash{
  position:absolute;
  inset:0;
  z-index:10;
  pointer-events:none;
  background:
    radial-gradient(ellipse 44% 58% at 11% 32%,rgba(186,230,253,.58),transparent 90%),
    radial-gradient(ellipse 42% 65% at 88% 24%,rgba(191,219,254,.67),transparent 88%),
    linear-gradient(116deg,#f9fcff 0%,#eef7ff 51%,#e6f1ff 100%);
  opacity:1;
  transition:opacity 300ms ease;
}
html.dark .lf-hero-lightwash{opacity:0}
.lf-hero-content{position:relative;z-index:20}
.lf-hero-description{color:#475569}
html.dark .lf-hero-description{color:#cbd5e1}
.lf .lf-demo-col{background:var(--demo-bg)}
.lf-demo-badge{background:var(--demo-badge);color:var(--demo-badge-text);border:0;box-shadow:none}
.lf-demo-title{color:var(--demo-title)}
.lf-demo-subtitle{color:var(--demo-subtitle)}
.lf-footer-title{color:var(--text)}
.lf-header-link:hover{color:#0284c7}
html.dark .lf-header-link:hover{color:#ffffff}
.lf-hero-secondary{color:#0369a1}
.lf-hero-secondary:hover{color:#075985}
html.dark .lf-hero-secondary{color:#cbd5e1}
html.dark .lf-hero-secondary:hover{color:#ffffff}
.lf-btn {
  background-color: var(--accent) !important;
  color: #fff !important;
  font-weight: 600;
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    background-color .2s ease,
    transform .2s var(--ease),
    box-shadow .2s ease;
}

.lf-btn:hover {
  background-color: #38bdf8 !important;
  color: #fff !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -8px rgba(14,165,233,.6);
}
.lf-btn:active{transform:scale(.97)}
.lf-ghost {
  background-color: transparent !important;
  color: var(--ghost-text) !important;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-weight: 500;
  transition:
    background-color .2s ease,
    transform .2s var(--ease);
}
.lf-ghost:hover {
  background-color: var(--ghost-hover) !important;
  color: var(--ghost-hover-text) !important;
}
.lf-ghost:active{transform:scale(.97)}
.lf a:focus-visible,.lf button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* Hover lift for cards and tiles */
.lf-lift{transition:transform .3s var(--ease),border-color .3s ease,box-shadow .3s ease}
.lf-lift:hover{transform:translateY(-4px);border-color:rgba(14,165,233,.5);box-shadow:0 14px 32px -14px rgba(14,165,233,.3)}
.lf-chip{transition:border-color .25s ease,background-color .25s ease,transform .25s var(--ease)}
.lf-chip:hover{border-color:rgba(14,165,233,.6);background:rgba(14,165,233,.08);transform:translateY(-2px)}
.lf-link{transition:color .2s ease}

/* Hero background: camera drift on the photo, floating glows on top */
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
.lf-header{position:sticky;top:0;z-index:50;background:var(--header-bg);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  transition:box-shadow .3s ease,background-color .3s ease}
.lf-header.lf-scrolled{box-shadow:0 8px 24px -12px rgba(15,23,42,.20)}
html.dark .lf-header.lf-scrolled{box-shadow:0 8px 24px -12px rgba(0,0,0,.7)}
html{scroll-padding-top:5rem}

/* Scroll reveal */
.lf-reveal{opacity:0;transform:translateY(28px);
  transition:opacity .8s var(--ease),transform .8s var(--ease)}
.lf-reveal.lf-in{opacity:1;transform:none}

/* Page-load entrance */
@keyframes lfRise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes lfDrop{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
.lf-rise{opacity:0;animation:lfRise .9s var(--ease) forwards}
.lf-drop{opacity:0;animation:lfDrop .7s var(--ease) forwards}

/* Workflow demo: the shoot card slides into its new stage */
@keyframes lfSlideFwd{from{opacity:0;transform:translateX(-18px) scale(.96)}to{opacity:1;transform:none}}
@keyframes lfSlideBack{from{opacity:0;transform:translateX(18px) scale(.96)}to{opacity:1;transform:none}}
.lf-slide-fwd{animation:lfSlideFwd .45s var(--ease) both}
.lf-slide-back{animation:lfSlideBack .45s var(--ease) both}

@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media (prefers-reduced-motion:reduce){
  .lf-reveal,.lf-rise,.lf-drop,.lf-slide-fwd,.lf-slide-back{opacity:1;transform:none;animation:none;transition:none}
  .lf-btn,.lf-ghost,.lf-lift,.lf-chip,.lf-card{transition:none}
  .lf-btn:hover,.lf-lift:hover,.lf-chip:hover{transform:none}
  .lf-hero-img{animation:none}
  .lf-orb{display:none}
}
/* FORCE LANDING PAGE BUTTON COLORS — OVERRIDE GLOBAL THEME */
#root .lf .lf-btn,
#root .lf button.lf-btn,
#root .lf a.lf-btn {
  background: #0ea5e9 !important;
  background-color: #0ea5e9 !important;
  color: #ffffff !important;
  border-color: transparent !important;
  opacity: 1 !important;
}

#root .lf .lf-btn:hover,
#root .lf button.lf-btn:hover,
#root .lf a.lf-btn:hover {
  background: #38bdf8 !important;
  background-color: #38bdf8 !important;
  color: #ffffff !important;
}

#root .lf .lf-btn:disabled {
  opacity: 0.5 !important;
}

#root .lf .lf-ghost {
  background: transparent !important;
  color: var(--ghost-text) !important;
}

#root .lf .lf-ghost:hover {
  background: var(--ghost-hover) !important;
  color: var(--ghost-hover-text) !important;
}
/* Remove visible borders from workflow demo arrows */
.lf .lf-ghost,
.lf .lf-ghost:hover,
.lf .lf-ghost:disabled {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Keep inactive arrow dark and subtle */
.lf .lf-ghost:disabled {
  background: transparent !important;
  color: #64748b !important;
  opacity: 0.65 !important;
}



/* The original workflow layout stays intact; only hide its scrollbar. */
.lf .lf-workflow-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}
.lf .lf-workflow-scroll::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

/* Original compact booking card, with softer colors in LIGHT mode only. */
.lf .lf-demo-event {
  background: #eff7fd !important;
  border-color: #b8d8ef !important;
  transition: background-color 200ms ease, border-color 200ms ease;
}
.lf .lf-demo-event:hover {
  background: #e6f3fc !important;
  border-color: #7ac6f1 !important;
}
/* Keep the original dark-mode booking-card colors unchanged. */
html.dark .lf .lf-demo-event {
  background: rgba(14, 165, 233, 0.10) !important;
  border-color: rgba(14, 165, 233, 0.6) !important;
}
html.dark .lf .lf-demo-event:hover {
  background: rgba(14, 165, 233, 0.10) !important;
  border-color: rgba(14, 165, 233, 0.6) !important;
}
@media (prefers-reduced-motion: reduce) {
  .lf .lf-demo-event { transition: none !important; }
}

`;

const STAGES = [
  { name: "Coming Events", dot: "#0ea5e9" },
  { name: "Today’s Event", dot: "#f59e0b" },
  { name: "Shoot Completed", dot: "#a855f7" },
  { name: "Editing", dot: "#f97316" },
  { name: "Edit Complete", dot: "#6366f1" },
  { name: "Delivered", dot: "#14b8a6" },
  { name: "Completed", dot: "#22c55e" },
];

const OVERVIEW = [
  ["Total clients", "24", "Across all categories"],
  ["Clients today", "2", "On the schedule"],
  ["Projects editing", "5", "In the editing stage"],
  ["Total folders", "31", "Shared with Culling"],
  ["Collected this month", "₱82,000", "Cash received this month"],
  ["To collect", "₱38,000", "Balance owed on events"],
];

const CATEGORIES = [
  "Weddings", "Prenup", "Couple Shoot", "Life & Family Milestones",
  "Portrait & Lifestyle", "Events & Performances", "Corporate & Commercial",
  "Real Estate", "Product & Business", "Baptism", "Pet Photography",
];

const FEATURES = [
  ["Schedule", "Book events with the client, venue, category, date and fee. Record downpayments under each event’s payments."],
  ["Workflow", "Follow every shoot from coming event to completed. Drag cards between stages or use the arrows."],
  ["Clients", "Card or list view of every client with their active project, fee and status. Status turns Completed once all their events are done."],
  ["Culling Station", "Review each shoot’s photos in folders, and use the Duplicates tab to find repeats."],
  ["Media Storage", "Organize files by client and project. Folders are shared with Culling, and deleted files wait in the Trash Bin."],
  ["Revenue Overview", "Booked fees, cash collected and what’s still outstanding by day, month or year, with CSV export."],
];

// ---------- Animation helpers ----------

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Becomes true the first time the element scrolls into view.
function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, seen];
}

// Fades and slides its content up when it scrolls into view.
function Reveal({ as: Tag = "div", delay = 0, className = "", children }) {
  const [ref, seen] = useInView();
  return (
    <Tag
      ref={ref}
      className={`lf-reveal ${seen ? "lf-in" : ""} ${className}`}
      style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}

// Counts a number up when it scrolls into view. "₱82,000" becomes 0 → 82,000.
function CountUp({ value }) {
  const match = /^(\D*)([\d,]+)(.*)$/.exec(value);
  const [ref, seen] = useInView();
  const target = match ? Number(match[2].replace(/,/g, "")) : 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!match || !seen) return;
    if (prefersReducedMotion()) {
      setN(target);
      return;
    }
    let frame;
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, target]);

  if (!match) return <span>{value}</span>;
  return (
    <span ref={ref} className="tabular-nums">
      {match[1]}{n.toLocaleString("en-US")}{match[3]}
    </span>
  );
}

// ---------- Small pieces ----------

const Title = ({ children, dot = "#0ea5e9" }) => (
  <p className="flex items-center gap-2 text-sm font-semibold">
    <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
    {children}
  </p>
);

function WorkflowDemo() {
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState("fwd");
  const scrollRef = useRef(null);
  const columnRefs = useRef([]);
  const firstRender = useRef(true);
  const last = STAGES.length - 1;

  const go = (next) => {
    if (next < 0 || next > last) return;
    setDir(next > at ? "fwd" : "back");
    setAt(next);
  };

  // Keep the active stage centered inside the workflow, not the whole page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const scroller = scrollRef.current;
    const activeColumn = columnRefs.current[at];
    if (!scroller || !activeColumn) return;

    const viewport = scroller.getBoundingClientRect();
    const column = activeColumn.getBoundingClientRect();
    const target = scroller.scrollLeft + column.left - viewport.left
      - (scroller.clientWidth - column.width) / 2;

    scroller.scrollTo({
      left: Math.max(0, target),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [at]);

  return (
    <div className="lf-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xl font-bold">Workflow</p>
          <p className="lf-muted text-xs">Try it: move the sample shoot through its stages.</p>
        </div>
        <div className="flex gap-2">
          {/* Previous */}
          <button
            type="button"
            aria-label="Previous stage"
            disabled={at === 0}
            onClick={() => go(at - 1)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-300 ${
              at > 0
                ? "lf-btn"
                : "lf-ghost opacity-50 cursor-not-allowed"
            }`}
          >
            ←
          </button>

          {/* Next */}
          <button
            type="button"
            aria-label="Next stage"
            disabled={at === last}
            onClick={() => go(at + 1)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-300 ${
              at < last
                ? "lf-btn"
                : "lf-ghost opacity-50 cursor-not-allowed"
            }`}
          >
            →
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="lf-workflow-scroll flex gap-3 pb-2"
        role="region"
        aria-label="Sample booking workflow stages"
        tabIndex={0}
      >
        {STAGES.map((s, i) => (
          <div
            key={s.name}
            ref={(el) => (columnRefs.current[i] = el)}
            className="lf-card lf-demo-col min-w-[150px] flex-1 p-3"
            style={{ borderColor: i === at ? "rgba(14,165,233,.55)" : undefined }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase">
                <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                {s.name}
              </span>
              <span
                className="lf-demo-badge rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              >
                {i === at ? 1 : 0}
              </span>
            </div>
            {i === at ? (
              <div
                key={at}
                role="button"
                tabIndex={0}
                onClick={() => go(Math.min(at + 1, last))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(Math.min(at + 1, last));
                  }
                }}
                className={`lf-demo-event lf-slide-${dir} w-full cursor-pointer rounded-lg border p-3 text-left`}
              >
                <span
                  className="lf-demo-title block text-sm font-semibold"
                >
                  Angela’s wedding
                </span>

                <span
                  className="lf-demo-subtitle block text-xs"
                >
                  Weddings · ₱45,000
                </span>
              </div>
            ) : (
              <div className="lf-dashed lf-muted py-5 text-center text-[11px]">Nothing here</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage({ loginHref = "/login", onLogin }) {
  return (
    <div className="lf min-h-screen">
      <style>{CSS}</style>

      <NavBar loginHref={loginHref} onLogin={onLogin} />

      <main>
        {/* Hero: background photo, then each part rises in one after the other */}
        <section className="lf-hero relative isolate overflow-hidden">
          <HeroBackground />
          <div className="lf-hero-lightwash" aria-hidden="true" />

          <div className="lf-hero-content mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pb-32 sm:pt-32">
            <h1
              className="lf-rise max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "150ms" }}
            >
              Every shoot, from booking to delivery, in one place.
            </h1>
            <p
              className="lf-rise lf-hero-description mt-5 max-w-xl text-lg"
              style={{ animationDelay: "300ms" }}
            >
              LensFlow keeps your clients, schedule, payments and photos together,
              so you always know where each job stands.
            </p>
            <div
              className="lf-rise mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: "450ms" }}
            >
              <LoginButton href={loginHref} onLogin={onLogin} className="lf-btn px-6 py-3">Create your studio</LoginButton>
              <a href="#features" className="lf-link lf-hero-secondary px-3 py-3">See what’s inside</a>
            </div>
          </div>
        </section>

        <Reveal as="section" className="mx-auto max-w-6xl px-5 pb-16">
          <WorkflowDemo />
        </Reveal>

        {/* Dashboard preview */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <Reveal>
            <h2 className="text-2xl font-bold sm:text-3xl">Your studio at a glance</h2>
            <p className="lf-muted mt-2 max-w-xl">
              The dashboard shows today’s clients, what’s in editing, and what you’ve collected
              against what you’re still owed. Sample figures shown.
            </p>
          </Reveal>
          <Reveal delay={120} className="lf-card mt-6 p-4 sm:p-5">
            <Title>Overview</Title>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {OVERVIEW.map(([label, value, note]) => (
                <div key={label} className="lf-lift rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
                  <p className="lf-muted text-[11px] font-medium uppercase">{label}</p>
                  <p className="mt-2 text-3xl font-bold"><CountUp value={value} /></p>
                  <p className="lf-muted mt-1 flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{note}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 pb-16">
          <Reveal>
            <h2 className="text-2xl font-bold sm:text-3xl">Built around how a photo job runs</h2>
          </Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([name, text], i) => (
              <Reveal key={name} delay={(i % 3) * 100}>
                <div className="lf-card lf-lift h-full p-5">
                  <Title>{name}</Title>
                  <p className="lf-muted mt-3 text-sm leading-relaxed">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal as="section" className="mx-auto max-w-6xl px-5 pb-16">
          <div id="categories" className="lf-card p-5 sm:p-6">
            <Title dot="#f59e0b">Made for every kind of shoot</Title>
            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c} className="lf-chip rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="mx-auto max-w-6xl px-5 pb-16">
          <div className="lf-card p-5 sm:p-6">
            <Title dot="#22c55e">Private to your account</Title>
            <p className="lf-muted mt-3 max-w-xl text-sm leading-relaxed">
              Each account only sees its own clients, events, payments and photos. Review where
              you’re signed in and sign out other devices from Settings.
            </p>
          </div>
        </Reveal>

        <Reveal as="section" className="mx-auto max-w-6xl px-5 pb-20">
          <div className="lf-dashed px-6 py-14 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold">Ready to run your studio from one screen?</h2>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <LoginButton href={loginHref} onLogin={onLogin} className="lf-btn px-7 py-3">Create your studio</LoginButton>
            </div>
          </div>
        </Reveal>
      </main>

      <footer className="border-t" style={{ borderColor: "var(--line)", background: "var(--bar)" }}>
        <div className="lf-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-sm sm:flex-row">
          <span className="lf-footer-title font-semibold">LensFlow</span>
          <span>© {new Date().getFullYear()} LensFlow. Studio management for photographers.</span>
        </div>
      </footer>
    </div>
  );
}