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
      className="lf-rise mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-[#10192C] p-4 shadow-xl shadow-black/20 sm:p-6"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <FaKey />
        </span>
        <h3 className="font-semibold text-white">Connect to your photographer</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Enter the unique code your photographer shared with you.
      </p>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. A3F9C21B"
        maxLength={16}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center font-mono text-lg tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="lf-btn rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={connecting || code.trim().length < 4}
          className="lf-btn rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect"}
        </button>
      </div>
    </form>
  );
}