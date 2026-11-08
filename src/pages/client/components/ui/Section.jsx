
export default function Section({
  title,
  dot = "bg-sky-400",
  right,
  children,
  id,
  reveal = true,
}) {
  return (
    <section
      id={id}
      className={`
        ${reveal ? "lf-reveal" : ""}

        min-w-0 rounded-xl
        border border-slate-200

        bg-white p-3
        text-slate-900

        shadow-sm

        transition-colors duration-300

        sm:p-4

        dark:border-slate-700
        dark:bg-[#10192C]
        dark:text-slate-100
        dark:shadow-black/10
      `}
    >
      <header
        className="
          mb-3 flex items-center
          justify-between gap-2
        "
      >
        <h3
          className="
            flex min-w-0 items-center
            gap-2 text-sm font-semibold

            text-slate-900
            dark:text-white
          "
        >
          <span
            className={`
              lf-dot
              h-2 w-2 shrink-0
              rounded-full
              ${dot}
            `}
            aria-hidden="true"
          />

          <span className="min-w-0 break-words">
            {title}
          </span>
        </h3>

        {right && (
          <div className="flex shrink-0 items-center">
            {right}
          </div>
        )}
      </header>

      {children}
    </section>
  );
}
