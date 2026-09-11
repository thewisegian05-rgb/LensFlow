import { useState } from "react";
import { FaTimes, FaEnvelope } from "react-icons/fa";

function ForgotPasswordModal({
  onClose,
  onSubmit,
  loading = false,
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const result = await onSubmit(email);

    if (result?.success) {
      setMessage(
        "If an account exists for this email, a password reset link has been sent."
      );
    } else if (result?.error) {
      setError(result.error);
    }
  };

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

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              <FaEnvelope />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Forgot Password
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Enter the email associated with your LensFlow account.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border-none !bg-transparent p-2 text-slate-500 transition hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setMessage("");
              }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-500/30 dark:bg-green-500/10">
              <p className="text-sm text-green-700 dark:text-green-400">
                {message}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;