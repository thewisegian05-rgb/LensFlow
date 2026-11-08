
/*
  Title block shown at the top of
  every Client Portal tab except Home.
*/

export default function TabHeader({
  eyebrow,
  title,
  text,
}) {
  return (
    <div className="mb-4 min-w-0">
      {eyebrow && (
        <p
          className="
            text-xs font-semibold
            uppercase tracking-[0.18em]

            text-sky-600
            dark:text-sky-400
          "
        >
          {eyebrow}
        </p>
      )}

      <h2
        className="
          mt-1 break-words
          text-2xl font-bold
          tracking-tight

          text-slate-900
          dark:text-white
        "
      >
        {title}
      </h2>

      {text && (
        <p
          className="
            mt-2 max-w-3xl
            text-sm leading-relaxed

            text-slate-600
            dark:text-slate-400
          "
        >
          {text}
        </p>
      )}
    </div>
  );
}
