/* Title block shown at the top of every tab except Home */
export default function TabHeader({ eyebrow, title, text }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-white">{title}</h2>
      {text && <p className="mt-2 max-w-3xl text-sm text-slate-400">{text}</p>}
    </div>
  );
}