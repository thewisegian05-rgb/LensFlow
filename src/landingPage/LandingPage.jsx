import { useState } from "react";

// Matches the LensFlow app UI: deep navy background, dark bordered cards,
// sky-blue accent, dot-marked card titles and dashed empty states.
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.lf{--bg:#020617;--bar:#0a1122;--card:#0a1020;--line:#17213a;--muted:#8a94ab;--accent:#0ea5e9;
  font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:#fff}
.lf-card{background:var(--card);border:1px solid var(--line);border-radius:14px}
.lf-dashed{border:1px dashed #243049;border-radius:12px}
.lf-muted{color:var(--muted)}
.lf-btn{background:var(--accent);color:#fff;font-weight:600;border-radius:8px;transition:background-color .15s}
.lf-btn:hover{background:#38bdf8}
.lf-ghost{border:1px solid var(--line);border-radius:8px;font-weight:500}
.lf-ghost:hover{background:var(--card)}
.lf a:focus-visible,.lf button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.lf-pop{transition:background-color .2s,border-color .2s}
@media (prefers-reduced-motion:reduce){.lf-pop,.lf-btn{transition:none}}
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

// Every call-to-action button goes to the login page. Works with a plain link by default. Pass onLogin={() => navigate("/login")} to use your router instead.
const LoginButton = ({ href, onLogin, className = "", children }) =>
  onLogin ? (
    <button type="button" onClick={onLogin} className={className}>{children}</button>
  ) : (
    <a href={href} className={className}>{children}</a>
  );

const Title = ({ children, dot = "#0ea5e9" }) => (
  <p className="flex items-center gap-2 text-sm font-semibold">
    <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
    {children}
  </p>
);

function WorkflowDemo() {
  const [at, setAt] = useState(0);
  const last = STAGES.length - 1;
  return (
    <div className="lf-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xl font-bold">Workflow</p>
          <p className="lf-muted text-xs">Try it: move the sample shoot through its stages.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous stage" disabled={at === 0}
            onClick={() => setAt(at - 1)}
            className="lf-ghost px-3 py-1.5 text-sm disabled:opacity-40">←</button>
          <button type="button" aria-label="Next stage" disabled={at === last}
            onClick={() => setAt(at + 1)}
            className="lf-btn px-3 py-1.5 text-sm disabled:opacity-40">→</button>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((s, i) => (
          <div key={s.name} className="lf-card min-w-[150px] flex-1 p-3" style={{ background: "#070d1c" }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase">
                <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                {s.name}
              </span>
              <span className="rounded-full bg-slate-800 px-1.5 text-[10px]">{i === at ? 1 : 0}</span>
            </div>
            {i === at ? (
              <button type="button" onClick={() => setAt(Math.min(at + 1, last))}
                className="lf-pop w-full rounded-lg border border-sky-500/60 bg-sky-500/10 p-3 text-left">
                <span className="block text-sm font-semibold">Angela’s wedding</span>
                <span className="lf-muted block text-xs">Weddings · ₱45,000</span>
              </button>
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

      <header className="border-b" style={{ borderColor: "var(--line)", background: "var(--bar)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="leading-tight">
            <span className="block text-xl font-bold">
              <span className="mr-2 text-sky-500">◉</span>LensFlow
            </span>
            <span className="lf-muted block text-[11px]">Studio Management</span>
          </a>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#features" className="lf-muted hidden hover:text-white sm:inline">Features</a>
            <a href="#categories" className="lf-muted hidden hover:text-white sm:inline">Shoot types</a>
            <LoginButton href={loginHref} onLogin={onLogin} className="lf-btn px-4 py-2">Get started</LoginButton>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-14 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Every shoot, from booking to delivery, in one place.
          </h1>
          <p className="lf-muted mt-5 max-w-xl text-lg">
            LensFlow keeps your clients, schedule, payments and photos together,
            so you always know where each job stands.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LoginButton href={loginHref} onLogin={onLogin} className="lf-btn px-6 py-3">Create your studio</LoginButton>
            <a href="#features" className="lf-muted px-3 py-3 hover:text-white">See what’s inside</a>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <WorkflowDemo />
        </section>

        {/* Dashboard preview */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Your studio at a glance</h2>
          <p className="lf-muted mt-2 max-w-xl">
            The dashboard shows today’s clients, what’s in editing, and what you’ve collected
            against what you’re still owed. Sample figures shown.
          </p>
          <div className="lf-card mt-6 p-4 sm:p-5">
            <Title>Overview</Title>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {OVERVIEW.map(([label, value, note]) => (
                <div key={label} className="rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
                  <p className="lf-muted text-[11px] font-medium uppercase">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                  <p className="lf-muted mt-1 flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Built around how a photo job runs</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([name, text]) => (
              <div key={name} className="lf-card p-5">
                <Title>{name}</Title>
                <p className="lf-muted mt-3 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-6xl px-5 pb-16">
          <div className="lf-card p-5 sm:p-6">
            <Title dot="#f59e0b">Made for every kind of shoot</Title>
            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span key={c} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="lf-card p-5 sm:p-6">
            <Title dot="#22c55e">Private to your account</Title>
            <p className="lf-muted mt-3 max-w-xl text-sm leading-relaxed">
              Each account only sees its own clients, events, payments and photos. Review where
              you’re signed in and sign out other devices from Settings.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="lf-dashed px-6 py-14 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold">Ready to run your studio from one screen?</h2>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <LoginButton href={loginHref} onLogin={onLogin} className="lf-btn px-7 py-3">Create your studio</LoginButton>
            </div>
          </div>
        </section>
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