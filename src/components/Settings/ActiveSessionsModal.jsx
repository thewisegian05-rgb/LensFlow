import {
  FaTimes,
  FaDesktop,
  FaMobileAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";

function ActiveSessionsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              Active Sessions
            </h3>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Devices currently signed in to your LensFlow account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {/* Sessions */}
        <div className="space-y-3">

          {/* Current Session */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-lg text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <FaDesktop />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Windows • Chrome
                  </p>

                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    Current
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <FaMapMarkerAlt className="text-xs" />
                  <span>Location unavailable</span>
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Active now
                </p>
              </div>
            </div>
          </div>

          {/* Another Session */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-lg text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                <FaMobileAlt />
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Android • Chrome
                </p>

                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <FaMapMarkerAlt className="text-xs" />
                  <span>Location unavailable</span>
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Last active recently
                </p>
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActiveSessionsModal;