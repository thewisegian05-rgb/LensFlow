import { FaKey, FaSignOutAlt } from "react-icons/fa";

export default function ClientHeader({
  connections,
  activeId,
  onSelect,
  showCodeButton,
  onOpenCode,
  onSignOut,
}) {
  return (
    <header className="lf-header-in flex min-h-[64px] flex-wrap items-center justify-end gap-3 border-b border-slate-800 bg-[#0B1120]/95 px-4 py-3 sm:px-6 lg:px-8 xl:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {/* Photographer switcher: hidden on xl screens because the right panel already shows it */}
        {connections.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 xl:hidden">
            {connections.map((c) => (
              <button
                key={c.photographer_id}
                type="button"
                onClick={() => onSelect(c.photographer_id)}
                className={`lf-btn max-w-[180px] truncate rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  activeId === c.photographer_id
                    ? "border-sky-400 bg-sky-500/10 text-sky-300"
                    : "border-slate-700 bg-[#10192C] text-slate-400 hover:border-slate-600 hover:text-white"
                }`}
              >
                {c.display_name || "Photographer"}
              </button>
            ))}
          </div>
        )}
        {showCodeButton && (
          <button
            type="button"
            onClick={onOpenCode}
            className="lf-cta flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            <FaKey /> Enter Connection Code
          </button>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="lf-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <FaSignOutAlt /> Sign out
        </button>
      </div>
    </header>
  );
}