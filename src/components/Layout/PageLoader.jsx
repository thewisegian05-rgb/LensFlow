
import { FaCameraRetro } from "react-icons/fa";

function PageLoader({ visible }) {
  return (
    <div
      className={`
        absolute inset-0 z-[100]
        flex items-center justify-center
        bg-slate-950/40 text-slate-50
        backdrop-blur-[2px]
        transition-opacity duration-500 ease-in-out
        ${
          visible
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }
        motion-reduce:transition-none
      `}
      role="status"
      aria-label="Loading page"
      aria-hidden={!visible}
      inert={!visible}
    >
      <div
        className={`
          flex flex-col items-center gap-3 p-6 text-center
          transition-transform duration-500 ease-out
          ${
            visible
              ? "translate-y-0 scale-100"
              : "translate-y-1 scale-[0.97]"
          }
          motion-reduce:transform-none motion-reduce:transition-none
        `}
      >
        {/* Animated camera icon */}
        <div className="relative grid h-[76px] w-[76px] place-items-center">
          {/* Outer rotating ring */}
          <div
            className="
              absolute inset-0 animate-spin rounded-full
              border-[3px] border-transparent
              border-r-blue-400 border-t-blue-500
              motion-reduce:animate-none
            "
          />

          {/* Inner rotating ring */}
          <div
            className="
              absolute inset-[9px]
              animate-[spin_1.6s_linear_infinite_reverse]
              rounded-full border-2 border-blue-300/40
              motion-reduce:animate-none
            "
          />

          <FaCameraRetro
            className="
              relative z-10 text-3xl text-blue-400
              drop-shadow-[0_0_10px_rgba(59,130,246,0.55)]
            "
            aria-hidden="true"
          />
        </div>

        {/* Brand */}
        <h2 className="text-[23px] font-bold tracking-tight text-blue-400">
          LensFlow
        </h2>

        <p className="text-[13px] text-slate-500 dark:text-slate-100">
          Preparing your workspace...
        </p>

        {/* Progress indicator */}
        <div className="mt-2 h-1 w-[150px] overflow-hidden rounded-full bg-blue-950/70">
          <div className="h-full w-full animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
