import { FaSignOutAlt, FaTimes } from "react-icons/fa";

function SignOutOthersModal({
  onClose,
  onConfirm,
  loading = false,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <FaSignOutAlt />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Sign Out Other Devices?
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                This will sign your LensFlow account out from all other devices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Information */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Your current device will remain signed in.
          </p>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Other devices will need to sign in again before accessing LensFlow.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg border border-red-500 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing Out..." : "Sign Out Others"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignOutOthersModal;