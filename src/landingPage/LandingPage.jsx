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
.lf{--bg:#020617;--bar:#0a1122;--card:#0a1020;--line:#17213a;--muted:#8a94ab;--accent:#0ea5e9;
  --ease:cubic-bezier(.22,1,.36,1);
  font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:#fff}
.lf-card{background:var(--card);border:1px solid var(--line);border-radius:14px;transition:border-color .3s ease}
.lf-dashed{border:1px dashed #243049;border-radius:12px}
.lf-muted{color:var(--muted)}
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
  color: #cbd5e1 !important;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-weight: 500;
  transition:
    background-color .2s ease,
    transform .2s var(--ease);
}
.lf-ghost:hover {
  background-color: var(--card) !important;
  color: #fff !important;
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
.lf-header{position:sticky;top:0;z-index:50;background:rgba(10,17,34,.85);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);transition:box-shadow .3s ease}
.lf-header.lf-scrolled{box-shadow:0 8px 24px -12px rgba(0,0,0,.7)}
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
  color: #cbd5e1 !important;
}

#root .lf .lf-ghost:hover {
  background: #0a1020 !important;
  color: #ffffff !important;
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
  const columnRefs = useRef([]);
  const firstRender = useRef(true);
  const last = STAGES.length - 1;

  const go = (next) => {
    if (next < 0 || next > last) return;
    setDir(next > at ? "fwd" : "back");
    setAt(next);
  };

  // Keep the active column in view on small screens (skipped on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    columnRefs.current[at]?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
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
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((s, i) => (
          <div
            key={s.name}
            ref={(el) => (columnRefs.current[i] = el)}
            className="lf-card min-w-[150px] flex-1 p-3"
            style={{
              background: "#070d1c",
              borderColor: i === at ? "rgba(14,165,233,.55)" : undefined,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase">
                <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                {s.name}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: "#1e293b",
                  color: "#cbd5e1",
                  border: "none",
                  boxShadow: "none",
                }}
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
                className={`lf-slide-${dir} w-full cursor-pointer rounded-lg border border-sky-500/60 bg-sky-500/10 p-3 text-left`}
                style={{
                  backgroundColor: "rgba(14, 165, 233, 0.10)",
                  color: "#ffffff",
                  borderColor: "rgba(14, 165, 233, 0.6)",
                }}
              >
                <span
                  className="block text-sm font-semibold"
                  style={{ color: "#ffffff" }}
                >
                  Angela’s wedding
                </span>

                <span
                  className="block text-xs"
                  style={{ color: "#8a94ab" }}
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
        <section className="relative overflow-hidden">
          <HeroBackground />

          <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pb-32 sm:pt-32">
            <h1
              className="lf-rise max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "150ms" }}
            >
              Every shoot, from booking to delivery, in one place.
            </h1>
            <p
              className="lf-rise mt-5 max-w-xl text-lg text-slate-300"
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
              <a href="#features" className="lf-link px-3 py-3 text-slate-300 hover:text-white">See what’s inside</a>
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
          <span className="font-semibold text-white">LensFlow</span>
          <span>© {new Date().getFullYear()} LensFlow. Studio management for photographers.</span>
        </div>
      </footer>
    </div>
  );
}