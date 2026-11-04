export default function Section({ title, dot, right, children, id, reveal = true }) {
  return (
    <section
      id={id}
      className={`${reveal ? "lf-reveal " : ""}min-w-0 rounded-xl border border-slate-700 bg-[#10192C] p-3 shadow-sm shadow-black/10 sm:p-4`}
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