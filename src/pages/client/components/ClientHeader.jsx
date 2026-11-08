
import {
  FaKey,
  FaSignOutAlt,
} from "react-icons/fa";

// ==========================================
// CLIENT HEADER
// ==========================================

export default function ClientHeader({
  connections = [],
  activeId,
  onSelect,
  showCodeButton,
  onOpenCode,
  onSignOut,
}) {
  return (
    <header
      className="
        lf-header-in

        flex min-h-[64px]
        flex-wrap items-center
        justify-end gap-3

        border-b border-slate-200

        bg-white/95
        px-4 py-3

        text-slate-900

        shadow-sm
        backdrop-blur-lg

        transition-colors duration-300

        sm:px-6
        lg:px-8
        xl:hidden

        dark:border-slate-800
        dark:bg-[#0B1120]/95
        dark:text-slate-100
        dark:shadow-none
      "
    >
      <div
        className="
          flex flex-wrap
          items-center gap-2
        "
      >

        {/* ==================================
            PHOTOGRAPHER SWITCHER
            Only displayed below xl screens
           ================================== */}

        {connections.length > 1 && (
          <div
            className="
              flex flex-wrap
              items-center gap-2

              xl:hidden
            "
          >
            {connections.map((connection, index) => {
              const id =
                connection.photographer_id ??
                connection.id;

              const name =
                connection.display_name ||
                connection.photographer_name ||
                connection.studio_name ||
                connection.business_name ||
                "Photographer";

              const active =
                String(activeId) === String(id);

              return (
                <button
                  key={id ?? index}
                  type="button"
                  onClick={() =>
                    onSelect?.(id)
                  }
                  disabled={!id}
                  title={name}
                  aria-pressed={active}
                  className={`
                    lf-btn

                    max-w-[180px]
                    truncate

                    rounded-lg border

                    px-3 py-2

                    text-xs font-medium

                    transition-all duration-200

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-sky-400

                    disabled:opacity-50

                    ${
                      active
                        ? `
                          border-sky-400
                          bg-sky-50
                          text-sky-700

                          dark:border-sky-400
                          dark:bg-sky-500/10
                          dark:text-sky-300
                        `
                        : `
                          border-slate-200
                          bg-white
                          text-slate-600

                          hover:border-sky-300
                          hover:bg-slate-100
                          hover:text-slate-900

                          dark:border-slate-700
                          dark:bg-[#10192C]
                          dark:text-slate-400

                          dark:hover:border-slate-600
                          dark:hover:bg-slate-800
                          dark:hover:text-white
                        `
                    }
                  `}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {/* ==================================
            ENTER CONNECTION CODE
           ================================== */}

        {showCodeButton && (
          <button
            type="button"
            onClick={onOpenCode}
            className="
              lf-cta

              flex items-center gap-2

              rounded-full
              bg-sky-500

              px-4 py-2.5

              text-xs font-semibold
              text-slate-950

              shadow-sm
              shadow-sky-500/20

              transition-all duration-200

              hover:bg-sky-400

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-sky-500
            "
          >
            <FaKey
              className="shrink-0"
              aria-hidden="true"
            />

            <span>
              Enter Connection Code
            </span>
          </button>
        )}

        {/* ==================================
            SIGN OUT
            Mobile only
           ================================== */}

        <button
          type="button"
          onClick={onSignOut}
          className="
            lf-btn

            flex items-center gap-2

            rounded-lg

            px-3 py-2

            text-xs font-medium

            text-rose-600

            transition-colors duration-200

            hover:bg-rose-50
            hover:text-rose-700

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-rose-500

            lg:hidden

            dark:text-rose-400
            dark:hover:bg-rose-500/10
            dark:hover:text-rose-300
          "
        >
          <FaSignOutAlt
            className="shrink-0"
            aria-hidden="true"
          />

          <span>
            Sign out
          </span>
        </button>
      </div>
    </header>
  );
}
