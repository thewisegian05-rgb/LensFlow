import { useState } from "react";
import { FaKey } from "react-icons/fa";

/* Enter-a-code card */
export default function CodeForm({ onConnect, connecting, error, onCancel }) {
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConnect(code, () => setCode(""));
      }}
      className="lf-rise mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-900/10 transition-colors duration-300 sm:p-6 dark:border-slate-700 dark:bg-[#10192C] dark:text-white dark:shadow-black/20"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
          <FaKey aria-hidden="true" />
        </span>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Connect to your photographer
        </h3>
      </div>

      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Enter the unique code your photographer shared with you.
      </p>

      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. A3F9C21B"
        maxLength={16}
        aria-label="Photographer connection code"
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-center font-mono text-lg tracking-[0.25em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
      />

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg !border !border-slate-300 !bg-white px-4 py-2 text-sm font-medium !text-slate-700 transition-colors hover:!bg-slate-100 dark:!border-slate-700 dark:!bg-slate-800 dark:!text-slate-200 dark:hover:!bg-slate-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={connecting || code.trim().length < 4}
          className="rounded-lg !border !border-transparent !bg-sky-500 px-4 py-2 text-sm font-semibold !text-slate-950 transition-colors hover:!bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect"}
        </button>
      </div>
    </form>
  );
}
